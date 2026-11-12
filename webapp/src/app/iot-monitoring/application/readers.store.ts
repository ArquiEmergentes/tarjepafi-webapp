import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, map } from 'rxjs';
import { DataRecorder } from '../../data-management/application/data-recorder.service';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { LocalDateTime, toMs } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { Incident, IncidentType } from '../domain/model/incident.entity';
import { DeviceType, Reader, ReaderAction, ReaderStatus } from '../domain/model/reader.entity';
import { ConfigurationError, ReaderConfiguration, validateConfiguration } from '../domain/model/reader-configuration';
import { TelemetrySample } from '../domain/model/telemetry-sample.entity';
import { IncidentsApiEndpoint, ReadersApiEndpoint, TelemetryApiEndpoint } from '../infrastructure/iot-api-endpoints';

export type ReaderError =
  | ConfigurationError
  | 'ID_FORMAT'
  | 'ID_TAKEN'
  | 'NAME_REQUIRED'
  | 'TYPE_REQUIRED'
  | 'SPACE_REQUIRED'
  | 'NOT_ALLOWED'
  | 'NO_RESPONSE'
  | 'SAVE_FAILED';

const FAILING_KEY = 'tp.failingReaders';

export type ReaderResult<T> = { ok: true; value: T } | { ok: false; errors: ReaderError[] };

export interface RegisterReaderInput {
  id: string;
  name: string;
  deviceType: DeviceType | null;
  spaceId: string | null;
  configuration: Partial<ReaderConfiguration>;
}

export interface HealthCheckResult {
  reader: Reader;
  sample: TelemetrySample;
  reconnected: boolean;
}

/** Estado y casos de uso de IoT Monitoring para lectores (reglas 6.C). */
@Injectable({ providedIn: 'root' })
export class ReadersStore {
  private readonly readersApi = inject(ReadersApiEndpoint);
  private readonly telemetryApi = inject(TelemetryApiEndpoint);
  private readonly incidentsApi = inject(IncidentsApiEndpoint);
  private readonly recorder = inject(DataRecorder);
  private readonly clock = inject(SimulatedClock);

  private readonly readerList = signal<Reader[]>([]);
  private readonly incidentList = signal<Incident[]>([]);
  private readonly failingIds = signal<ReadonlySet<string>>(this.restoreFailing());
  private evaluating = false;

  readonly readers = this.readerList.asReadonly();
  /** Lectores con falla de conexión simulada: no envían heartbeats ni responden health checks. */
  readonly failing = this.failingIds.asReadonly();
  readonly incidents = this.incidentList.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly loaded = signal(false);

  readonly countByStatus = computed(() => {
    const counts: Record<ReaderStatus, number> = { REGISTERED: 0, ACTIVE: 0, INACTIVE: 0, OFFLINE: 0, DEGRADED: 0, MAINTENANCE: 0 };
    for (const r of this.readerList()) counts[r.status]++;
    return counts;
  });
  readonly openIncidents = computed(() => this.incidentList().filter((i) => i.isOpen()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const { readers, incidents } = await firstValueFrom(
        forkJoin({ readers: this.readersApi.getAll({ _sort: 'id' }), incidents: this.incidentsApi.getAll() }),
      );
      this.readerList.set(readers);
      this.incidentList.set(incidents);
      this.loaded.set(true);
      await this.evaluateConnectivity();
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded() && !this.loading()) await this.load();
  }

  reader(id: string): Reader | undefined {
    return this.readerList().find((r) => r.id === id);
  }

  incidentsOf(readerId: string): Incident[] {
    return this.incidentList()
      .filter((i) => i.readerId === readerId)
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  telemetry(readerId: string): Observable<TelemetrySample[]> {
    return this.telemetryApi
      .getAll({ readerId })
      .pipe(map((list) => [...list].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))));
  }

  // ---------- Casos de uso ----------

  /** Registro de lector: ID RDR-X-000 único, campos obligatorios y estado inicial REGISTERED. */
  async register(input: RegisterReaderInput): Promise<ReaderResult<Reader>> {
    const id = input.id.trim().toUpperCase();
    const errors: ReaderError[] = [];
    if (!Reader.isValidId(id)) errors.push('ID_FORMAT');
    if (!input.name.trim()) errors.push('NAME_REQUIRED');
    if (!input.deviceType) errors.push('TYPE_REQUIRED');
    if (!input.spaceId) errors.push('SPACE_REQUIRED');
    errors.push(...validateConfiguration(input.configuration));
    if (errors.length === 0) {
      try {
        const existing = await firstValueFrom(this.readersApi.getAll({ id }));
        if (existing.length > 0) errors.push('ID_TAKEN');
      } catch {
        return { ok: false, errors: ['SAVE_FAILED'] };
      }
    }
    if (errors.length > 0 || !input.deviceType || !input.spaceId) return { ok: false, errors };

    const reader = new Reader({
      id,
      name: input.name.trim(),
      deviceType: input.deviceType,
      spaceId: input.spaceId,
      status: 'REGISTERED',
      configuration: this.normalize(input.configuration as ReaderConfiguration),
      registeredAt: this.clock.now(),
      lastSeenAt: null,
    });
    try {
      const saved = await firstValueFrom(this.readersApi.create(reader));
      await this.record(saved.id, { action: 'REGISTER', toStatus: saved.status });
      this.readerList.update((list) => [...list, saved].sort((a, b) => a.id.localeCompare(b.id)));
      return { ok: true, value: saved };
    } catch {
      return { ok: false, errors: ['SAVE_FAILED'] };
    }
  }

  /** Activar, desactivar e iniciar/finalizar mantenimiento. */
  async changeStatus(readerId: string, action: ReaderAction): Promise<ReaderResult<Reader>> {
    const reader = this.reader(readerId);
    if (!reader || !reader.can(action)) return { ok: false, errors: ['NOT_ALLOWED'] };
    const updated = reader.apply(action, this.clock.now());
    return this.save(reader, updated, { action });
  }

  /** Configuración: si es inválida se conserva la anterior y se devuelven los errores. */
  async updateConfiguration(readerId: string, config: Partial<ReaderConfiguration>): Promise<ReaderResult<Reader>> {
    const reader = this.reader(readerId);
    if (!reader) return { ok: false, errors: ['NOT_ALLOWED'] };
    const errors = validateConfiguration(config);
    if (errors.length > 0) return { ok: false, errors };
    const updated = reader.withConfiguration(this.normalize(config as ReaderConfiguration));
    return this.save(reader, updated, { action: 'CONFIGURATION', configuration: updated.configuration });
  }

  /**
   * Health check simulado: el lector responde, se guarda una muestra de telemetría y se actualiza
   * su última conexión. Si estaba OFFLINE vuelve a ACTIVE y se cierran sus incidencias de desconexión.
   */
  async healthCheck(readerId: string): Promise<ReaderResult<HealthCheckResult>> {
    const reader = this.reader(readerId);
    if (!reader || !reader.isMonitored()) return { ok: false, errors: ['NOT_ALLOWED'] };
    if (this.failingIds().has(readerId)) return { ok: false, errors: ['NO_RESPONSE'] };
    const now = this.clock.now();
    try {
      const previous = (await firstValueFrom(this.telemetry(readerId))).at(-1);
      const updated = reader.heartbeat(now);
      const sample = await firstValueFrom(
        this.telemetryApi.create(
          new TelemetrySample({
            id: newId('tel'),
            readerId,
            capturedAt: now,
            signalStrength: this.simulatedSignal(updated.status),
            uptime: previous ? previous.uptime + Math.max(0, Math.round((toMs(now) - toMs(previous.capturedAt)) / 1000)) : 0,
            firmwareVersion: reader.configuration.firmwareVersion,
            status: updated.status,
          }),
        ),
      );
      const saved = await this.save(reader, updated, { action: 'HEALTH_CHECK', signalStrength: sample.signalStrength });
      if (!saved.ok) return saved;
      const reconnected = reader.status === 'OFFLINE';
      if (reconnected) {
        for (const incident of this.incidentsOf(readerId).filter((i) => i.isOpen() && i.type === 'DEVICE_OFFLINE')) {
          await this.resolveIncident(incident);
        }
      }
      return { ok: true, value: { reader: saved.value, sample, reconnected } };
    } catch {
      return { ok: false, errors: ['SAVE_FAILED'] };
    }
  }

  async resolveIncident(incident: Incident): Promise<ReaderResult<Incident>> {
    if (!incident.isOpen()) return { ok: false, errors: ['NOT_ALLOWED'] };
    try {
      const saved = await firstValueFrom(this.incidentsApi.update(incident.resolve(this.clock.now())));
      this.incidentList.update((list) => list.map((i) => (i.id === saved.id ? saved : i)));
      return { ok: true, value: saved };
    } catch {
      return { ok: false, errors: ['SAVE_FAILED'] };
    }
  }

  /**
   * Conectividad (6.C): si un lector en servicio no se comunica en 3 heartbeats según la hora simulada,
   * pasa a OFFLINE y se abre la incidencia DEVICE_OFFLINE. Devuelve cuántos lectores cambiaron.
   */
  async evaluateConnectivity(): Promise<number> {
    if (this.evaluating) return 0;
    this.evaluating = true;
    const now = this.clock.now();
    let changed = 0;
    try {
      for (const reader of this.readerList().filter((r) => r.hasLostConnection(now))) {
        const result = await this.save(reader, reader.markOffline(), { action: 'CONNECTION_LOST' });
        if (!result.ok) continue;
        changed++;
        const alreadyOpen = this.incidentsOf(reader.id).some((i) => i.isOpen() && i.type === 'DEVICE_OFFLINE');
        if (!alreadyOpen) {
          await this.openIncident(reader.id, 'DEVICE_OFFLINE', now, reader.lastSeenAt);
        }
      }
    } finally {
      this.evaluating = false;
    }
    return changed;
  }

  // ---------- Simulación de conectividad (hora simulada) ----------

  /** Activa o quita la falla de conexión simulada de un lector. */
  setFailing(readerId: string, failing: boolean): void {
    const next = new Set(this.failingIds());
    if (failing) next.add(readerId);
    else next.delete(readerId);
    this.failingIds.set(next);
    try {
      localStorage.setItem(FAILING_KEY, JSON.stringify([...next]));
    } catch {
      // la simulación vive solo en memoria
    }
  }

  /**
   * Al adelantar la hora simulada, los lectores en servicio que estaban comunicándose envían su heartbeat
   * en la nueva hora. Los que ya estaban sin comunicarse o tienen una falla simulada no lo envían.
   */
  async heartbeatHealthyReaders(previousNow: LocalDateTime, newNow: LocalDateTime): Promise<number> {
    if (toMs(newNow) <= toMs(previousNow)) return 0;
    await this.ensureLoaded();
    const healthy = this.readerList().filter(
      (r) => r.canProcessTaps() && !this.failingIds().has(r.id) && !r.hasLostConnection(previousNow),
    );
    for (const reader of healthy) {
      try {
        const saved = await firstValueFrom(this.readersApi.update(reader.heartbeat(newNow)));
        this.readerList.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
      } catch {
        // si falla, la siguiente evaluación lo marcará sin conexión
      }
    }
    return healthy.length;
  }

  /** Paso 5 del flujo de lectura: el lector se comunicó al procesar la lectura. */
  async markSeen(readerId: string, at: LocalDateTime): Promise<void> {
    const reader = this.reader(readerId);
    if (!reader) return;
    const saved = await firstValueFrom(this.readersApi.update(reader.seenAt(at)));
    this.readerList.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
  }

  // ---------- Internos ----------

  private restoreFailing(): ReadonlySet<string> {
    try {
      const raw = localStorage.getItem(FAILING_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private async openIncident(readerId: string, type: IncidentType, at: LocalDateTime, lastSeenAt: LocalDateTime | null): Promise<void> {
    try {
      const incident = await firstValueFrom(
        this.incidentsApi.create(
          new Incident({
            id: newId('inc'),
            readerId,
            type,
            detectedAt: at,
            description: lastSeenAt
              ? `El lector no envía heartbeats desde ${lastSeenAt.replace('T', ' ').slice(0, 16)}.`
              : 'El lector no ha enviado ningún heartbeat.',
            resolvedAt: null,
          }),
        ),
      );
      this.incidentList.update((list) => [...list, incident]);
      await this.record(readerId, { incidentType: type, incidentId: incident.id });
    } catch {
      // La incidencia se volverá a intentar en la siguiente evaluación.
    }
  }

  private async save(before: Reader, after: Reader, payload: Record<string, unknown>): Promise<ReaderResult<Reader>> {
    try {
      const saved = await firstValueFrom(this.readersApi.update(after));
      this.readerList.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
      await this.record(saved.id, { fromStatus: before.status, toStatus: saved.status, ...payload });
      return { ok: true, value: saved };
    } catch {
      return { ok: false, errors: ['SAVE_FAILED'] };
    }
  }

  private record(readerId: string, payload: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(
      this.recorder.record({ sourceContext: 'IOT_MONITORING', dataType: 'DEVICE_TELEMETRY', subjectId: readerId, payload }),
    );
  }

  private normalize(config: ReaderConfiguration): ReaderConfiguration {
    return {
      readerMode: config.readerMode,
      communicationInterval: Number(config.communicationInterval),
      heartbeatInterval: Number(config.heartbeatInterval),
      firmwareVersion: config.firmwareVersion.trim(),
    };
  }

  /** Señal simulada: buena para lectores sanos, débil para lectores degradados. */
  private simulatedSignal(status: ReaderStatus): number {
    const [min, max] = status === 'DEGRADED' ? [76, 88] : [42, 64];
    return -(min + Math.floor(Math.random() * (max - min + 1)));
  }
}
