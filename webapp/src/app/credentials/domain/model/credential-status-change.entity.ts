import { LocalDateTime } from '../../../shared/domain/date-time';
import { CredentialStatus } from './credential.entity';

export type StatusChangeReason = 'WITHDRAWAL' | 'REENROLLMENT' | 'ENROLLMENT_NOT_COMPLETED' | 'LOST' | 'MANUAL';

/** Autor de un cambio: id del usuario administrador o el proceso automático. */
export const SYSTEM_ACTOR = 'SYSTEM';

export interface CredentialStatusChangeProps {
  id: string;
  credentialId: string;
  fromStatus: CredentialStatus;
  toStatus: CredentialStatus;
  reason: StatusChangeReason;
  changedBy: string;
  changedAt: LocalDateTime;
  /** Detalle libre: motivo escrito por el administrador o titular vinculado. */
  note?: string | null;
}

/** Entrada del historial de estados (`credentialStatusHistory`). */
export class CredentialStatusChange {
  readonly id: string;
  readonly credentialId: string;
  readonly fromStatus: CredentialStatus;
  readonly toStatus: CredentialStatus;
  readonly reason: StatusChangeReason;
  readonly changedBy: string;
  readonly changedAt: LocalDateTime;
  readonly note: string | null;

  constructor(props: CredentialStatusChangeProps) {
    this.id = props.id;
    this.credentialId = props.credentialId;
    this.fromStatus = props.fromStatus;
    this.toStatus = props.toStatus;
    this.reason = props.reason;
    this.changedBy = props.changedBy;
    this.changedAt = props.changedAt;
    this.note = props.note ?? null;
  }

  isAutomatic(): boolean {
    return this.changedBy === SYSTEM_ACTOR;
  }

  /** Cambio sin transición de estado (por ejemplo, vinculación de titular). */
  keepsStatus(): boolean {
    return this.fromStatus === this.toStatus;
  }

  toProps(): CredentialStatusChangeProps {
    return { ...this };
  }
}
