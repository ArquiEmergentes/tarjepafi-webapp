import { LocalDateTime, toMs } from '../../../shared/domain/date-time';
import { ReaderConfiguration } from './reader-configuration';

export type ReaderStatus = 'REGISTERED' | 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
export type DeviceType = 'CLASSROOM_READER' | 'TURNSTILE' | 'DOOR_READER' | 'DESK_READER';
export type ReaderAction = 'ACTIVATE' | 'DEACTIVATE' | 'START_MAINTENANCE' | 'END_MAINTENANCE';

export const READER_STATUSES: readonly ReaderStatus[] = ['ACTIVE', 'DEGRADED', 'OFFLINE', 'REGISTERED', 'INACTIVE', 'MAINTENANCE'];
export const DEVICE_TYPES: readonly DeviceType[] = ['CLASSROOM_READER', 'TURNSTILE', 'DOOR_READER', 'DESK_READER'];

/** Transiciones manuales (regla 6.C). */
const TRANSITIONS: Record<ReaderAction, { from: readonly ReaderStatus[]; to: ReaderStatus }> = {
  ACTIVATE: { from: ['REGISTERED', 'INACTIVE'], to: 'ACTIVE' },
  DEACTIVATE: { from: ['ACTIVE', 'DEGRADED', 'OFFLINE'], to: 'INACTIVE' },
  START_MAINTENANCE: { from: ['REGISTERED', 'ACTIVE', 'INACTIVE', 'OFFLINE', 'DEGRADED'], to: 'MAINTENANCE' },
  END_MAINTENANCE: { from: ['MAINTENANCE'], to: 'ACTIVE' },
};
const READER_ACTIONS: readonly ReaderAction[] = ['ACTIVATE', 'DEACTIVATE', 'START_MAINTENANCE', 'END_MAINTENANCE'];

/** Un lector se considera sin conexión si no se comunica en 3 heartbeats. */
export const MISSED_HEARTBEATS_FOR_OFFLINE = 3;

/** Formato del identificador: RDR-X-000. */
export const READER_ID_PATTERN = /^RDR-[A-Z]-\d{3}$/;

export interface ReaderProps {
  id: string;
  name: string;
  deviceType: DeviceType;
  spaceId: string;
  status: ReaderStatus;
  configuration: ReaderConfiguration;
  registeredAt: LocalDateTime;
  lastSeenAt: LocalDateTime | null;
}

export class Reader {
  readonly id: string;
  readonly name: string;
  readonly deviceType: DeviceType;
  readonly spaceId: string;
  readonly status: ReaderStatus;
  readonly configuration: ReaderConfiguration;
  readonly registeredAt: LocalDateTime;
  readonly lastSeenAt: LocalDateTime | null;

  constructor(props: ReaderProps) {
    this.id = props.id;
    this.name = props.name;
    this.deviceType = props.deviceType;
    this.spaceId = props.spaceId;
    this.status = props.status;
    this.configuration = { ...props.configuration };
    this.registeredAt = props.registeredAt;
    this.lastSeenAt = props.lastSeenAt;
  }

  static isValidId(id: string): boolean {
    return READER_ID_PATTERN.test(id);
  }

  /** Solo los lectores ACTIVE o DEGRADED procesan lecturas. */
  canProcessTaps(): boolean {
    return this.status === 'ACTIVE' || this.status === 'DEGRADED';
  }

  /** Lectores que deberían estar enviando heartbeats. */
  isMonitored(): boolean {
    return this.canProcessTaps() || this.status === 'OFFLINE';
  }

  can(action: ReaderAction): boolean {
    return TRANSITIONS[action].from.includes(this.status);
  }

  canBeActivated(): boolean {
    return this.can('ACTIVATE');
  }

  canBeDeactivated(): boolean {
    return this.can('DEACTIVATE');
  }

  availableActions(): ReaderAction[] {
    return READER_ACTIONS.filter((a) => this.can(a));
  }

  /** Límite de silencio permitido: 3 × heartbeat (en milisegundos). */
  silenceToleranceMs(): number {
    return this.configuration.heartbeatInterval * MISSED_HEARTBEATS_FOR_OFFLINE * 1000;
  }

  /** true si un lector en servicio lleva más de 3 heartbeats sin comunicarse (según la hora simulada). */
  hasLostConnection(now: LocalDateTime): boolean {
    if (!this.canProcessTaps()) return false;
    if (!this.lastSeenAt) return true;
    return toMs(now) - toMs(this.lastSeenAt) > this.silenceToleranceMs();
  }

  /** Aplica una transición manual. Al volver al servicio se registra comunicación en ese instante. */
  apply(action: ReaderAction, at: LocalDateTime): Reader {
    if (!this.can(action)) throw new Error(`Transición ${action} no permitida desde ${this.status}`);
    const to = TRANSITIONS[action].to;
    return this.copy({ status: to, lastSeenAt: to === 'ACTIVE' ? at : this.lastSeenAt });
  }

  markOffline(): Reader {
    return this.copy({ status: 'OFFLINE' });
  }

  /** Heartbeat recibido: actualiza la última conexión y, si estaba OFFLINE, vuelve a ACTIVE. */
  heartbeat(at: LocalDateTime): Reader {
    return this.copy({ lastSeenAt: at, status: this.status === 'OFFLINE' ? 'ACTIVE' : this.status });
  }

  /** Tap procesado: el lector se comunicó en ese instante. */
  seenAt(at: LocalDateTime): Reader {
    return this.copy({ lastSeenAt: at });
  }

  withConfiguration(configuration: ReaderConfiguration): Reader {
    return this.copy({ configuration: { ...configuration } });
  }

  toProps(): ReaderProps {
    return { ...this, configuration: { ...this.configuration } };
  }

  private copy(changes: Partial<ReaderProps>): Reader {
    return new Reader({ ...this.toProps(), ...changes });
  }
}
