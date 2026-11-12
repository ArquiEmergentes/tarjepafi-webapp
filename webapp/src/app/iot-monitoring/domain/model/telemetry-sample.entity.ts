import { LocalDateTime } from '../../../shared/domain/date-time';
import { ReaderStatus } from './reader.entity';

/** Umbral a partir del cual la señal se considera débil. */
export const WEAK_SIGNAL_DBM = -75;

export interface TelemetrySampleProps {
  id: string;
  readerId: string;
  capturedAt: LocalDateTime;
  /** dBm (negativo; más cerca de 0 = mejor señal). */
  signalStrength: number;
  /** Segundos desde el último reinicio. */
  uptime: number;
  firmwareVersion: string;
  status: ReaderStatus;
}

export class TelemetrySample {
  readonly id: string;
  readonly readerId: string;
  readonly capturedAt: LocalDateTime;
  readonly signalStrength: number;
  readonly uptime: number;
  readonly firmwareVersion: string;
  readonly status: ReaderStatus;

  constructor(props: TelemetrySampleProps) {
    this.id = props.id;
    this.readerId = props.readerId;
    this.capturedAt = props.capturedAt;
    this.signalStrength = props.signalStrength;
    this.uptime = props.uptime;
    this.firmwareVersion = props.firmwareVersion;
    this.status = props.status;
  }

  hasWeakSignal(): boolean {
    return this.signalStrength < WEAK_SIGNAL_DBM;
  }

  toProps(): TelemetrySampleProps {
    return { ...this };
  }
}
