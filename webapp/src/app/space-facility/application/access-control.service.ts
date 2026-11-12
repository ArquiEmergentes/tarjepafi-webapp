import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CredentialDirectory } from '../../credentials/application/credential-directory.service';
import { DataRecorder } from '../../data-management/application/data-recorder.service';
import { TapContext, TapResult } from '../../shared/application/tap-result';
import { LocalDateTime, datePart, formatDuration } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { AccessDecision, AccessRecord, AccessType, DenialReason } from '../domain/model/access-record.entity';
import { Space } from '../domain/model/space.entity';
import { WorkShift } from '../domain/model/work-shift.entity';
import { AccessRecordsApiEndpoint, WorkShiftsApiEndpoint } from '../infrastructure/facility-api-endpoints';
import { SpaceCatalog } from './space-catalog.service';

export interface RejectedAttempt {
  tapEventId: string;
  readerId: string;
  spaceId: string;
  cardUid: string;
  credentialId: string | null;
  cardHolderId: string | null;
  at: LocalDateTime;
  reason: Extract<DenialReason, 'CARD_NOT_REGISTERED' | 'CARD_INACTIVE'>;
}

/**
 * Casos de uso de Space & Facility invocados por el simulador (regla 6.D):
 * áreas restringidas y espacios (US12, US14) y entrada/salida del campus (US24).
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly accessApi = inject(AccessRecordsApiEndpoint);
  private readonly shiftsApi = inject(WorkShiftsApiEndpoint);
  private readonly spaces = inject(SpaceCatalog);
  private readonly credentials = inject(CredentialDirectory);
  private readonly recorder = inject(DataRecorder);

  async space(spaceId: string): Promise<Space | undefined> {
    if (!this.spaces.byId().has(spaceId)) await firstValueFrom(this.spaces.load());
    return this.spaces.byId().get(spaceId);
  }

  accessTypeOf(space: Space): AccessType {
    if (space.type === 'CAMPUS_ENTRANCE') return 'CAMPUS_ENTRY';
    if (space.type === 'CAMPUS_EXIT') return 'CAMPUS_EXIT';
    return 'SPACE_ACCESS';
  }

  /** Acceso a un espacio: mantenimiento → denegado; luego excepciones de la tarjeta y roles del espacio. */
  async spaceAccess(ctx: TapContext): Promise<TapResult> {
    const space = await this.space(ctx.spaceId);
    if (!space) return { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.accessDenied' };
    const { decision } = await this.decide(ctx, space);
    return decision === 'GRANTED'
      ? { outcome: 'ACCESS', tone: 'success', messageKey: 'tap.accessGranted' }
      : { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.accessDenied' };
  }

  /** Torniquete: trabajadores abren/cierran su jornada; estudiantes y docentes solo generan un accessRecord. */
  async turnstile(ctx: TapContext): Promise<TapResult> {
    const space = await this.space(ctx.spaceId);
    if (!space) return { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.accessDenied' };
    const { decision } = await this.decide(ctx, space);
    if (decision === 'DENIED') return { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.accessDenied' };
    if (ctx.holderRole !== 'STAFF') return { outcome: 'ACCESS', tone: 'success', messageKey: 'tap.accessGranted' };
    return this.accessTypeOf(space) === 'CAMPUS_ENTRY' ? this.shiftEntry(ctx) : this.shiftExit(ctx);
  }

  /** Tarjeta no registrada o inactiva en un punto de acceso: se deja constancia del intento. */
  async recordRejection(attempt: RejectedAttempt): Promise<void> {
    const space = await this.space(attempt.spaceId);
    await this.saveAccess({
      id: newId('acc'),
      tapEventId: attempt.tapEventId,
      cardUid: attempt.cardUid,
      credentialId: attempt.credentialId,
      cardHolderId: attempt.cardHolderId,
      spaceId: attempt.spaceId,
      readerId: attempt.readerId,
      accessType: space ? this.accessTypeOf(space) : 'SPACE_ACCESS',
      decision: 'DENIED',
      denialReason: attempt.reason,
      attemptedAt: attempt.at,
    });
  }

  // ---------- Internos ----------

  private async decide(ctx: TapContext, space: Space): Promise<{ decision: AccessDecision; denialReason: DenialReason }> {
    let decision: AccessDecision = 'GRANTED';
    let denialReason: DenialReason = 'NONE';
    if (space.isInMaintenance()) {
      decision = 'DENIED';
      denialReason = 'SPACE_IN_MAINTENANCE';
    } else {
      const access = await this.credentials.resolveAccess(ctx.credentialId, space.id, ctx.holderRole, space.allowedRoles);
      if (!access.allowed) {
        decision = 'DENIED';
        denialReason = 'UNAUTHORIZED_ROLE';
      }
    }
    await this.saveAccess({
      id: newId('acc'),
      tapEventId: ctx.tapEventId,
      cardUid: ctx.cardUid,
      credentialId: ctx.credentialId,
      cardHolderId: ctx.cardHolderId,
      spaceId: space.id,
      readerId: ctx.readerId,
      accessType: this.accessTypeOf(space),
      decision,
      denialReason,
      attemptedAt: ctx.at,
    });
    return { decision, denialReason };
  }

  private async saveAccess(props: ConstructorParameters<typeof AccessRecord>[0]): Promise<void> {
    const saved = await firstValueFrom(this.accessApi.create(new AccessRecord(props)));
    await firstValueFrom(
      this.recorder.record({
        sourceContext: 'SPACE_AND_FACILITY',
        dataType: 'ACCESS',
        subjectId: saved.id,
        eventId: saved.tapEventId,
        occurredAt: saved.attemptedAt,
        payload: { decision: saved.decision, denialReason: saved.denialReason, accessType: saved.accessType, spaceId: saved.spaceId },
      }),
    );
  }

  private async shiftEntry(ctx: TapContext): Promise<TapResult> {
    const open = await firstValueFrom(this.shiftsApi.getAll({ cardHolderId: ctx.cardHolderId, status: 'OPEN' }));
    if (open.length > 0) return { outcome: 'WORK_SHIFT', tone: 'info', messageKey: 'tap.shiftAlreadyOpen' };
    const shift = await firstValueFrom(this.shiftsApi.create(WorkShift.open(newId('ws'), ctx.cardHolderId, ctx.at)));
    await this.shiftFact(shift, ctx.tapEventId);
    return { outcome: 'WORK_SHIFT', tone: 'success', messageKey: 'tap.shiftOpened' };
  }

  private async shiftExit(ctx: TapContext): Promise<TapResult> {
    const shifts = await firstValueFrom(this.shiftsApi.getAll({ cardHolderId: ctx.cardHolderId }));
    const open = shifts.find((s) => s.isOpen());
    if (open) {
      const closed = await firstValueFrom(this.shiftsApi.update(open.close(ctx.at)));
      await this.shiftFact(closed, ctx.tapEventId);
      return { outcome: 'WORK_SHIFT', tone: 'success', messageKey: 'tap.shiftClosed', params: { worked: formatDuration(closed.workedMinutes ?? 0) } };
    }
    if (shifts.some((s) => s.date === datePart(ctx.at))) return { outcome: 'WORK_SHIFT', tone: 'info', messageKey: 'tap.exitAlreadyRegistered' };
    return { outcome: 'REJECTED', tone: 'error', messageKey: 'tap.noEntryFound' };
  }

  private async shiftFact(shift: WorkShift, tapEventId: string): Promise<void> {
    await firstValueFrom(
      this.recorder.record({
        sourceContext: 'SPACE_AND_FACILITY',
        dataType: 'WORK_SHIFT',
        subjectId: shift.id,
        eventId: tapEventId,
        payload: { status: shift.status, workedMinutes: shift.workedMinutes },
      }),
    );
  }
}
