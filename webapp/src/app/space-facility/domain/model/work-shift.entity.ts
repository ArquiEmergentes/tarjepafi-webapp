import { LocalDateTime, datePart, minutesBetween } from '../../../shared/domain/date-time';

export type WorkShiftStatus = 'OPEN' | 'CLOSED';

export interface WorkShiftProps {
  id: string;
  cardHolderId: string;
  date: string;
  entryAt: LocalDateTime;
  exitAt: LocalDateTime | null;
  workedMinutes: number | null;
  status: WorkShiftStatus;
}

/** Jornada de un trabajador (US24). */
export class WorkShift {
  readonly id: string;
  readonly cardHolderId: string;
  readonly date: string;
  readonly entryAt: LocalDateTime;
  readonly exitAt: LocalDateTime | null;
  readonly workedMinutes: number | null;
  readonly status: WorkShiftStatus;

  constructor(props: WorkShiftProps) {
    this.id = props.id;
    this.cardHolderId = props.cardHolderId;
    this.date = props.date;
    this.entryAt = props.entryAt;
    this.exitAt = props.exitAt;
    this.workedMinutes = props.workedMinutes;
    this.status = props.status;
  }

  static open(id: string, cardHolderId: string, at: LocalDateTime): WorkShift {
    return new WorkShift({ id, cardHolderId, date: datePart(at), entryAt: at, exitAt: null, workedMinutes: null, status: 'OPEN' });
  }

  isOpen(): boolean {
    return this.status === 'OPEN';
  }

  close(at: LocalDateTime): WorkShift {
    return new WorkShift({ ...this.toProps(), exitAt: at, workedMinutes: minutesBetween(this.entryAt, at), status: 'CLOSED' });
  }

  toProps(): WorkShiftProps {
    return { ...this };
  }
}
