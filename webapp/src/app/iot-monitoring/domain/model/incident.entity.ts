import { LocalDateTime } from '../../../shared/domain/date-time';

export type IncidentType =
  | 'CONNECTIVITY_FAILURE'
  | 'READ_ERROR'
  | 'DEVICE_OFFLINE'
  | 'CONFIGURATION_ERROR'
  | 'HARDWARE_FAILURE';

export interface IncidentProps {
  id: string;
  readerId: string;
  type: IncidentType;
  detectedAt: LocalDateTime;
  description: string;
  resolvedAt: LocalDateTime | null;
}

export class Incident {
  readonly id: string;
  readonly readerId: string;
  readonly type: IncidentType;
  readonly detectedAt: LocalDateTime;
  readonly description: string;
  readonly resolvedAt: LocalDateTime | null;

  constructor(props: IncidentProps) {
    this.id = props.id;
    this.readerId = props.readerId;
    this.type = props.type;
    this.detectedAt = props.detectedAt;
    this.description = props.description;
    this.resolvedAt = props.resolvedAt;
  }

  isOpen(): boolean {
    return this.resolvedAt === null;
  }

  resolve(at: LocalDateTime): Incident {
    return new Incident({ ...this.toProps(), resolvedAt: at });
  }

  toProps(): IncidentProps {
    return { ...this };
  }
}
