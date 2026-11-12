import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AttendanceTapService } from '../../academic-attendance/application/attendance-tap.service';
import { SessionClosingService } from '../../academic-attendance/application/session-closing.service';
import { CardLookup, CredentialDirectory } from '../../credentials/application/credential-directory.service';
import { DataRecorder } from '../../data-management/application/data-recorder.service';
import { AccessControlService } from '../../space-facility/application/access-control.service';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { TapContext, TapResult } from '../../shared/application/tap-result';
import { LocalDateTime, addMinutes, isAfter } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { CardTapEvent } from '../domain/model/card-tap-event.entity';
import { Reader } from '../domain/model/reader.entity';
import { CardTapEventsApiEndpoint } from '../infrastructure/iot-api-endpoints';
import { ReadersStore } from './readers.store';

export interface SimulatedTap {
  event: CardTapEvent;
  result: TapResult;
  reader: Reader | undefined;
  holderName: string | null;
  /** true si el evento ya había sido procesado (no se vuelve a procesar). */
  duplicate: boolean;
}

const HISTORY_SIZE = 25;
/** Idioma de los lectores físicos del campus. */
const DEVICE_LANGUAGE = 'es';

/**
 * Simulador del lector NFC (A5 · regla 6.D). Crea el `cardTapEvent`, valida lector y tarjeta y delega
 * en los casos de uso de Academic Attendance o Space & Facility según el tipo de espacio del lector.
 */
@Injectable({ providedIn: 'root' })
export class NfcSimulator {
  private readonly eventsApi = inject(CardTapEventsApiEndpoint);
  private readonly readers = inject(ReadersStore);
  private readonly directory = inject(CredentialDirectory);
  private readonly attendance = inject(AttendanceTapService);
  private readonly closing = inject(SessionClosingService);
  private readonly access = inject(AccessControlService);
  private readonly recorder = inject(DataRecorder);
  private readonly clock = inject(SimulatedClock);
  private readonly translate = inject(TranslateService);

  private readonly events = signal<CardTapEvent[]>([]);
  readonly history = this.events.asReadonly();

  async loadHistory(): Promise<void> {
    const list = await firstValueFrom(this.eventsApi.getAll({ _sort: 'tappedAt', _order: 'desc', _limit: HISTORY_SIZE }));
    this.events.set(list);
  }

  /** "Pasar tarjeta" en un lector con la hora simulada actual. */
  async tap(readerId: string, rawUid: string): Promise<SimulatedTap> {
    const event = { id: newId('evt'), readerId, cardUid: CardTapEvent.normalizeUid(rawUid), tappedAt: this.clock.now() };
    return this.process(event);
  }

  /** Reenvía un evento ya registrado: por idempotencia no se vuelve a procesar. */
  async replay(event: CardTapEvent): Promise<SimulatedTap> {
    return this.process({ id: event.id, readerId: event.readerId, cardUid: event.cardUid, tappedAt: event.tappedAt });
  }

  // ---------- Flujo de cada lectura ----------

  private async process(input: { id: string; readerId: string; cardUid: string; tappedAt: LocalDateTime }): Promise<SimulatedTap> {
    await this.readers.ensureLoaded();
    const reader = this.readers.reader(input.readerId);

    // 1. El eventId es único: un evento nunca se procesa dos veces.
    const existing = await firstValueFrom(this.eventsApi.getAll({ id: input.id }));
    if (existing.length > 0) {
      return { event: existing[0], result: { outcome: existing[0].outcome, tone: 'info', messageKey: 'tap.duplicateEvent' }, reader, holderName: null, duplicate: true };
    }

    // Las sesiones vencidas se cierran antes de evaluar la lectura.
    await this.closing.closeDue();

    let lookup: CardLookup | null = null;
    let result: TapResult;
    if (!reader || !reader.canProcessTaps()) {
      // 2. Solo los lectores ACTIVE o DEGRADED procesan lecturas.
      result = { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.readerOutOfService' };
    } else {
      lookup = await this.directory.findByUid(input.cardUid);
      result = await this.resolve(input, reader, lookup);
      // 5. Toda lectura procesada actualiza la última conexión del lector y el último uso de la tarjeta.
      await this.readers.markSeen(reader.id, input.tappedAt);
      if (lookup) await this.directory.markUsed(lookup.credential, input.tappedAt);
    }

    const event = await firstValueFrom(
      this.eventsApi.create(
        new CardTapEvent({
          ...input,
          outcome: result.outcome,
          displayMessage: await this.deviceMessage(result),
          source: 'SIMULATOR',
        }),
      ),
    );
    await firstValueFrom(
      this.recorder.record({
        sourceContext: 'IOT_MONITORING',
        dataType: 'CARD_READING',
        subjectId: event.readerId,
        eventId: event.id,
        occurredAt: event.tappedAt,
        payload: { cardUid: event.cardUid, outcome: event.outcome },
      }),
    );
    this.events.update((list) => [event, ...list].slice(0, HISTORY_SIZE));
    return { event, result, reader, holderName: lookup?.holder?.fullName ?? null, duplicate: false };
  }

  /**
   * Texto que mostró el lector físico. Se guarda siempre en español (idioma de los lectores del campus),
   * sin importar el idioma de la interfaz; la pantalla del simulador lo traduce aparte.
   */
  private async deviceMessage(result: TapResult): Promise<string> {
    const text = await firstValueFrom(this.translate.get(result.messageKey, result.params, DEVICE_LANGUAGE));
    return typeof text === 'string' ? text : result.messageKey;
  }

  /** 3 y 4: tarjeta y regla según el tipo de espacio del lector. */
  private async resolve(
    input: { id: string; readerId: string; cardUid: string; tappedAt: LocalDateTime },
    reader: Reader,
    lookup: CardLookup | null,
  ): Promise<TapResult> {
    const space = await this.access.space(reader.spaceId);
    const isAccessPoint = space?.type !== 'CLASSROOM';

    // 3. Tarjeta no registrada, inactiva o sin titular.
    if (!lookup || !lookup.credential.isActive() || !lookup.holder) {
      const reason = lookup ? 'CARD_INACTIVE' : 'CARD_NOT_REGISTERED';
      if (isAccessPoint) {
        await this.access.recordRejection({
          tapEventId: input.id,
          readerId: reader.id,
          spaceId: reader.spaceId,
          cardUid: input.cardUid,
          credentialId: lookup?.credential.id ?? null,
          cardHolderId: lookup?.holder?.id ?? null,
          at: input.tappedAt,
          reason,
        });
      }
      return { outcome: 'REJECTED', tone: 'error', messageKey: lookup ? 'tap.cardInactive' : 'tap.cardNotRegistered' };
    }

    const ctx: TapContext = {
      tapEventId: input.id,
      readerId: reader.id,
      spaceId: reader.spaceId,
      cardUid: input.cardUid,
      credentialId: lookup.credential.id,
      cardHolderId: lookup.holder.id,
      holderRole: lookup.holder.role,
      at: input.tappedAt,
    };

    // 4. Regla según `spaces.type` del lector.
    switch (space?.type) {
      case 'CLASSROOM':
        return ctx.holderRole === 'STAFF' ? this.access.spaceAccess(ctx) : this.attendance.classroomTap(ctx);
      case 'MEETING_ROOM':
        return (ctx.holderRole === 'TEACHER' ? await this.attendance.meetingTap(ctx) : null) ?? this.access.spaceAccess(ctx);
      case 'CAMPUS_ENTRANCE':
      case 'CAMPUS_EXIT':
        return this.access.turnstile(ctx);
      default:
        return this.access.spaceAccess(ctx);
    }
  }
}

/**
 * Control de la hora simulada desde el simulador. Al adelantar el reloj, los lectores sanos envían su
 * heartbeat, se evalúa la conectividad y se cierran las sesiones vencidas.
 */
@Injectable({ providedIn: 'root' })
export class SimulationClockControl {
  private readonly clock = inject(SimulatedClock);
  private readonly readers = inject(ReadersStore);
  private readonly closing = inject(SessionClosingService);

  readonly now = this.clock.now;

  async moveTo(time: LocalDateTime): Promise<void> {
    const previous = this.clock.now();
    if (isAfter(time, previous)) await this.readers.heartbeatHealthyReaders(previous, time);
    this.clock.set(time);
    await this.readers.evaluateConnectivity();
    await this.closing.closeDue();
  }

  advance(minutes: number): Promise<void> {
    return this.moveTo(addMinutes(this.clock.now(), minutes));
  }
}
