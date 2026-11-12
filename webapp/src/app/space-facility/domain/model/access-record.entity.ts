import { LocalDateTime } from '../../../shared/domain/date-time';

export type AccessType = 'CAMPUS_ENTRY' | 'CAMPUS_EXIT' | 'SPACE_ACCESS';
export type AccessDecision = 'GRANTED' | 'DENIED';
export type DenialReason = 'NONE' | 'CARD_NOT_REGISTERED' | 'CARD_INACTIVE' | 'UNAUTHORIZED_ROLE' | 'SPACE_IN_MAINTENANCE';

export interface AccessRecordProps {
  id: string;
  tapEventId: string;
  cardUid: string;
  credentialId: string | null;
  cardHolderId: string | null;
  spaceId: string;
  readerId: string;
  accessType: AccessType;
  decision: AccessDecision;
  denialReason: DenialReason;
  attemptedAt: LocalDateTime;
}

/** Intento de acceso a un espacio o al campus (US12). */
export class AccessRecord {
  readonly id: string;
  readonly tapEventId: string;
  readonly cardUid: string;
  readonly credentialId: string | null;
  readonly cardHolderId: string | null;
  readonly spaceId: string;
  readonly readerId: string;
  readonly accessType: AccessType;
  readonly decision: AccessDecision;
  readonly denialReason: DenialReason;
  readonly attemptedAt: LocalDateTime;

  constructor(props: AccessRecordProps) {
    this.id = props.id;
    this.tapEventId = props.tapEventId;
    this.cardUid = props.cardUid;
    this.credentialId = props.credentialId;
    this.cardHolderId = props.cardHolderId;
    this.spaceId = props.spaceId;
    this.readerId = props.readerId;
    this.accessType = props.accessType;
    this.decision = props.decision;
    this.denialReason = props.denialReason;
    this.attemptedAt = props.attemptedAt;
  }

  isGranted(): boolean {
    return this.decision === 'GRANTED';
  }

  toProps(): AccessRecordProps {
    return { ...this };
  }
}
