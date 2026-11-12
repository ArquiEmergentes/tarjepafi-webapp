import { LocalDateTime, addMinutes, isAfter, isBefore, timePart } from '../../../shared/domain/date-time';

export type SessionType = 'CLASS' | 'MEETING';
export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';

/** La sesión acepta marcaciones desde 15 minutos antes de su inicio. */
export const EARLY_CHECK_IN_MINUTES = 15;
/** Si el docente no marca la salida, la sesión se cierra 15 minutos después de su fin. */
export const AUTO_CLOSE_MINUTES = 15;

export interface SessionProps {
  id: string;
  type: SessionType;
  /** null en reuniones. */
  scheduleId: string | null;
  title: string;
  spaceId: string;
  date: string;
  scheduledStart: LocalDateTime;
  scheduledEnd: LocalDateTime;
  toleranceMinutes: number;
  status: SessionStatus;
}

export class Session {
  readonly id: string;
  readonly type: SessionType;
  readonly scheduleId: string | null;
  readonly title: string;
  readonly spaceId: string;
  readonly date: string;
  readonly scheduledStart: LocalDateTime;
  readonly scheduledEnd: LocalDateTime;
  readonly toleranceMinutes: number;
  readonly status: SessionStatus;

  constructor(props: SessionProps) {
    this.id = props.id;
    this.type = props.type;
    this.scheduleId = props.scheduleId;
    this.title = props.title;
    this.spaceId = props.spaceId;
    this.date = props.date;
    this.scheduledStart = props.scheduledStart;
    this.scheduledEnd = props.scheduledEnd;
    this.toleranceMinutes = props.toleranceMinutes;
    this.status = props.status;
  }

  isMeeting(): boolean {
    return this.type === 'MEETING';
  }

  isFinished(): boolean {
    return this.status === 'FINISHED';
  }

  /** "10:00–11:30" */
  timeRange(): string {
    return `${timePart(this.scheduledStart)}–${timePart(this.scheduledEnd)}`;
  }

  opensAt(): LocalDateTime {
    return addMinutes(this.scheduledStart, -EARLY_CHECK_IN_MINUTES);
  }

  closesAt(): LocalDateTime {
    return addMinutes(this.scheduledEnd, AUTO_CLOSE_MINUTES);
  }

  /** Hora límite para llegar puntual (inicio + tolerancia). */
  punctualUntil(): LocalDateTime {
    return addMinutes(this.scheduledStart, this.toleranceMinutes);
  }

  /** En curso para marcar asistencia: desde 15 min antes del inicio hasta el fin (y no cerrada). */
  isInProgress(now: LocalDateTime): boolean {
    return !this.isFinished() && !isBefore(now, this.opensAt()) && !isAfter(now, this.scheduledEnd);
  }

  /** Ventana en la que el docente puede marcar (llegada hasta el fin; salida hasta el cierre automático). */
  isWithinTeacherWindow(now: LocalDateTime): boolean {
    return !isBefore(now, this.opensAt()) && !isAfter(now, this.closesAt());
  }

  /** Debe cerrarse automáticamente: pasó el fin + 15 min y no está cerrada. */
  shouldAutoClose(now: LocalDateTime): boolean {
    return !this.isFinished() && isAfter(now, this.closesAt());
  }

  /** Todavía no empieza su ventana de marcación. */
  isUpcoming(now: LocalDateTime): boolean {
    return isBefore(now, this.opensAt());
  }

  start(): Session {
    return new Session({ ...this.toProps(), status: 'IN_PROGRESS' });
  }

  finish(): Session {
    return new Session({ ...this.toProps(), status: 'FINISHED' });
  }

  toProps(): SessionProps {
    return { ...this };
  }
}

export interface SessionParticipantProps {
  id: string;
  sessionId: string;
  cardHolderId: string;
}

/** Convocado a una reunión o capacitación. */
export class SessionParticipant {
  readonly id: string;
  readonly sessionId: string;
  readonly cardHolderId: string;

  constructor(props: SessionParticipantProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.cardHolderId = props.cardHolderId;
  }

  toProps(): SessionParticipantProps {
    return { ...this };
  }
}
