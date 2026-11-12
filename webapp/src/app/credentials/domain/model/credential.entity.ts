import { LocalDateTime } from '../../../shared/domain/date-time';

export type CredentialStatus = 'ACTIVE' | 'BLOCKED' | 'LOST' | 'DEACTIVATED';
export type CredentialAction = 'BLOCK' | 'REPORT_LOST' | 'DEACTIVATE' | 'REACTIVATE';

/** Máquina de estados de la tarjeta (regla 6.B). */
const TRANSITIONS: Record<CredentialAction, { from: readonly CredentialStatus[]; to: CredentialStatus }> = {
  BLOCK: { from: ['ACTIVE'], to: 'BLOCKED' },
  REPORT_LOST: { from: ['ACTIVE'], to: 'LOST' },
  DEACTIVATE: { from: ['ACTIVE', 'BLOCKED', 'LOST'], to: 'DEACTIVATED' },
  REACTIVATE: { from: ['BLOCKED', 'LOST', 'DEACTIVATED'], to: 'ACTIVE' },
};

export const CREDENTIAL_ACTIONS: readonly CredentialAction[] = ['BLOCK', 'REPORT_LOST', 'DEACTIVATE', 'REACTIVATE'];

export interface CredentialProps {
  id: string;
  cardUid: string;
  /** null = tarjeta en stock, sin titular vinculado. */
  cardHolderId: string | null;
  status: CredentialStatus;
  issuedAt: LocalDateTime;
  statusChangedAt: LocalDateTime;
  lastUsedAt: LocalDateTime | null;
}

export class Credential {
  readonly id: string;
  readonly cardUid: string;
  readonly cardHolderId: string | null;
  readonly status: CredentialStatus;
  readonly issuedAt: LocalDateTime;
  readonly statusChangedAt: LocalDateTime;
  readonly lastUsedAt: LocalDateTime | null;

  constructor(props: CredentialProps) {
    this.id = props.id;
    this.cardUid = props.cardUid;
    this.cardHolderId = props.cardHolderId;
    this.status = props.status;
    this.issuedAt = props.issuedAt;
    this.statusChangedAt = props.statusChangedAt;
    this.lastUsedAt = props.lastUsedAt;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  isLinked(): boolean {
    return this.cardHolderId !== null;
  }

  can(action: CredentialAction): boolean {
    return TRANSITIONS[action].from.includes(this.status);
  }

  canBeBlocked(): boolean {
    return this.can('BLOCK');
  }

  canBeReportedLost(): boolean {
    return this.can('REPORT_LOST');
  }

  canBeDeactivated(): boolean {
    return this.can('DEACTIVATE');
  }

  canBeReactivated(): boolean {
    return this.can('REACTIVATE');
  }

  /** Acciones disponibles en el estado actual. */
  availableActions(): CredentialAction[] {
    return CREDENTIAL_ACTIONS.filter((a) => this.can(a));
  }

  /** Aplica la transición; lanza error si no está permitida desde el estado actual. */
  apply(action: CredentialAction, at: LocalDateTime): Credential {
    if (!this.can(action)) throw new Error(`Transición ${action} no permitida desde ${this.status}`);
    return new Credential({ ...this.toProps(), status: TRANSITIONS[action].to, statusChangedAt: at });
  }

  linkTo(cardHolderId: string): Credential {
    return new Credential({ ...this.toProps(), cardHolderId });
  }

  toProps(): CredentialProps {
    return { ...this };
  }
}
