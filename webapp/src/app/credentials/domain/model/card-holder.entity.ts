export type HolderRole = 'STUDENT' | 'TEACHER' | 'STAFF';
export type EnrollmentStatus = 'COMPLETED' | 'PENDING';

export interface CardHolderProps {
  id: string;
  code: string;
  fullName: string;
  email: string;
  role: HolderRole;
  program: string;
  /** Solo estudiantes; null para docentes y trabajadores. */
  enrollmentStatus: EnrollmentStatus | null;
}

/** Titular de una tarjeta. Sus datos provienen del Sistema Académico (simulado). */
export class CardHolder {
  readonly id: string;
  readonly code: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: HolderRole;
  readonly program: string;
  readonly enrollmentStatus: EnrollmentStatus | null;

  constructor(props: CardHolderProps) {
    this.id = props.id;
    this.code = props.code;
    this.fullName = props.fullName;
    this.email = props.email;
    this.role = props.role;
    this.program = props.program;
    this.enrollmentStatus = props.enrollmentStatus;
  }

  isStudent(): boolean {
    return this.role === 'STUDENT';
  }

  /** Un estudiante sin matrícula completa no puede tener su tarjeta activa. */
  hasPendingEnrollment(): boolean {
    return this.isStudent() && this.enrollmentStatus !== 'COMPLETED';
  }

  toProps(): CardHolderProps {
    return { ...this };
  }
}
