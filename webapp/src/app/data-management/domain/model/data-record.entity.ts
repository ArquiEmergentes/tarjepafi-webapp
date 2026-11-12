import { LocalDateTime } from '../../../shared/domain/date-time';

export type SourceContext = 'IOT_MONITORING' | 'ACADEMIC_ATTENDANCE' | 'SPACE_AND_FACILITY' | 'CREDENTIALS';
export type DataType = 'CARD_READING' | 'ATTENDANCE' | 'ACCESS' | 'WORK_SHIFT' | 'CREDENTIAL_CHANGE' | 'DEVICE_TELEMETRY';

export interface DataRecordProps {
  id: string;
  eventId: string;
  sourceContext: SourceContext;
  dataType: DataType;
  subjectId: string;
  occurredAt: LocalDateTime;
  recordedAt: LocalDateTime;
  payload: Record<string, unknown>;
}

/** Hecho inmutable registrado por cualquier contexto; es la fuente de reportes y dashboard. */
export class DataRecord {
  readonly id: string;
  readonly eventId: string;
  readonly sourceContext: SourceContext;
  readonly dataType: DataType;
  readonly subjectId: string;
  readonly occurredAt: LocalDateTime;
  readonly recordedAt: LocalDateTime;
  readonly payload: Record<string, unknown>;

  constructor(props: DataRecordProps) {
    this.id = props.id;
    this.eventId = props.eventId;
    this.sourceContext = props.sourceContext;
    this.dataType = props.dataType;
    this.subjectId = props.subjectId;
    this.occurredAt = props.occurredAt;
    this.recordedAt = props.recordedAt;
    this.payload = props.payload;
  }

  toProps(): DataRecordProps {
    return { ...this };
  }
}
