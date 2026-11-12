import { TapOutcome } from '../../../shared/application/tap-result';
import { LocalDateTime } from '../../../shared/domain/date-time';

export type TapSource = 'SIMULATOR';

/** Formato de UID de tarjeta NFC: 4 a 7 bytes en hexadecimal separados por ":". */
export const CARD_UID_PATTERN = /^[0-9A-F]{2}(:[0-9A-F]{2}){3,6}$/;

export interface CardTapEventProps {
  /** eventId único: un evento nunca se procesa dos veces. */
  id: string;
  readerId: string;
  cardUid: string;
  tappedAt: LocalDateTime;
  outcome: TapOutcome;
  displayMessage: string;
  source: TapSource;
}

export class CardTapEvent {
  readonly id: string;
  readonly readerId: string;
  readonly cardUid: string;
  readonly tappedAt: LocalDateTime;
  readonly outcome: TapOutcome;
  readonly displayMessage: string;
  readonly source: TapSource;

  constructor(props: CardTapEventProps) {
    this.id = props.id;
    this.readerId = props.readerId;
    this.cardUid = props.cardUid;
    this.tappedAt = props.tappedAt;
    this.outcome = props.outcome;
    this.displayMessage = props.displayMessage;
    this.source = props.source;
  }

  static normalizeUid(raw: string): string {
    const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, '');
    return (hex.match(/.{1,2}/g) ?? []).join(':');
  }

  static isValidUid(uid: string): boolean {
    return CARD_UID_PATTERN.test(uid);
  }

  wasRejected(): boolean {
    return this.outcome === 'REJECTED';
  }

  toProps(): CardTapEventProps {
    return { ...this };
  }
}
