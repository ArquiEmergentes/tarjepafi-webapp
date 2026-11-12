import { LocalDateTime, isAfter, minutesBetween } from '../../../shared/domain/date-time';

export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'LATE' | 'ABSENT';
export type AttendanceRole = 'STUDENT' | 'TEACHER';
export type AttendanceSource = 'NFC' | 'TEACHER_EDIT' | 'SYSTEM';
/** Estados que el docente puede asignar al editar. */
export type EditableAttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export const EDIT_REASON_MAX_LENGTH = 255;

export interface AttendanceRecordProps {
  id: string;
  tapEventId: string | null;
  sessionId: string;
  cardHolderId: string;
  role: AttendanceRole;
  checkInAt: LocalDateTime | null;
  checkOutAt: LocalDateTime | null;
  durationMinutes: number | null;
  status: AttendanceStatus;
  confirmedAt: LocalDateTime | null;
  source: AttendanceSource;
  modifiedBy: string | null;
  modifiedAt: LocalDateTime | null;
  editReason: string | null;
}

export class AttendanceRecord {
  readonly id: string;
  readonly tapEventId: string | null;
  readonly sessionId: string;
  readonly cardHolderId: string;
  readonly role: AttendanceRole;
  readonly checkInAt: LocalDateTime | null;
  readonly checkOutAt: LocalDateTime | null;
  readonly durationMinutes: number | null;
  readonly status: AttendanceStatus;
  readonly confirmedAt: LocalDateTime | null;
  readonly source: AttendanceSource;
  readonly modifiedBy: string | null;
  readonly modifiedAt: LocalDateTime | null;
  readonly editReason: string | null;

  constructor(props: AttendanceRecordProps) {
    this.id = props.id;
    this.tapEventId = props.tapEventId;
    this.sessionId = props.sessionId;
    this.cardHolderId = props.cardHolderId;
    this.role = props.role;
    this.checkInAt = props.checkInAt;
    this.checkOutAt = props.checkOutAt;
    this.durationMinutes = props.durationMinutes;
    this.status = props.status;
    this.confirmedAt = props.confirmedAt;
    this.source = props.source;
    this.modifiedBy = props.modifiedBy;
    this.modifiedAt = props.modifiedAt;
    this.editReason = props.editReason;
  }

  /** PRESENT si la marcación es ≤ inicio + tolerancia; si no, LATE. */
  static resolveStatus(checkInAt: LocalDateTime, punctualUntil: LocalDateTime): 'PRESENT' | 'LATE' {
    return isAfter(checkInAt, punctualUntil) ? 'LATE' : 'PRESENT';
  }

  isPending(): boolean {
    return this.status === 'PENDING';
  }

  /** Asistió (presente o tarde). */
  attended(): boolean {
    return this.status === 'PRESENT' || this.status === 'LATE';
  }

  hasCheckedOut(): boolean {
    return this.checkOutAt !== null;
  }

  wasEditedByTeacher(): boolean {
    return this.source === 'TEACHER_EDIT';
  }

  /** Confirma un PENDING según su propia hora de marcación. */
  confirm(at: LocalDateTime, punctualUntil: LocalDateTime): AttendanceRecord {
    if (!this.isPending() || !this.checkInAt) return this;
    return this.copy({ status: AttendanceRecord.resolveStatus(this.checkInAt, punctualUntil), confirmedAt: at });
  }

  /** Salida del docente: calcula la duración. */
  checkOut(at: LocalDateTime): AttendanceRecord {
    const durationMinutes = this.checkInAt ? minutesBetween(this.checkInAt, at) : null;
    return this.copy({ checkOutAt: at, durationMinutes });
  }

  /** Edición del docente (regla 6.E). */
  edit(status: EditableAttendanceStatus, reason: string, by: string, at: LocalDateTime): AttendanceRecord {
    return this.copy({
      status,
      source: 'TEACHER_EDIT',
      modifiedBy: by,
      modifiedAt: at,
      editReason: reason.trim().slice(0, EDIT_REASON_MAX_LENGTH),
      confirmedAt: this.confirmedAt ?? at,
    });
  }

  toProps(): AttendanceRecordProps {
    return { ...this };
  }

  private copy(changes: Partial<AttendanceRecordProps>): AttendanceRecord {
    return new AttendanceRecord({ ...this.toProps(), ...changes });
  }
}
