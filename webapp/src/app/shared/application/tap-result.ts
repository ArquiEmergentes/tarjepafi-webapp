import { LocalDateTime } from '../domain/date-time';

/** Resultado de una lectura NFC (colección `cardTapEvents.outcome`). */
export type TapOutcome = 'ATTENDANCE' | 'ACCESS' | 'WORK_SHIFT' | 'REJECTED';
/** Cómo se ve el mensaje en la pantalla del lector. */
export type TapTone = 'success' | 'info' | 'error';

/**
 * Contrato entre IoT Monitoring (que recibe la lectura) y los contextos que la resuelven
 * (Academic Attendance, Space & Facility, Credentials). Solo viajan ids y el mensaje a mostrar.
 */
export interface TapResult {
  outcome: TapOutcome;
  tone: TapTone;
  /** Clave i18n del mensaje de la pantalla del lector (`tap.*`). */
  messageKey: string;
  params?: Record<string, string | number>;
}

/** Datos de la lectura que IoT entrega a los demás contextos. */
export interface TapContext {
  tapEventId: string;
  readerId: string;
  spaceId: string;
  cardUid: string;
  credentialId: string;
  cardHolderId: string;
  holderRole: 'STUDENT' | 'TEACHER' | 'STAFF';
  at: LocalDateTime;
}
