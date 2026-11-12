import { InjectionToken, Signal } from '@angular/core';

export type SessionRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF';

/** Vista mínima del usuario autenticado que necesita el layout compartido. */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: SessionRole;
  cardHolderId: string | null;
}

/**
 * Puerto que IAM implementa para que `shared` (layout, guards genéricos) no dependa
 * directamente de un bounded context.
 */
export interface SessionPort {
  readonly user: Signal<SessionUser | null>;
  signOut(): void;
}

export const SESSION_PORT = new InjectionToken<SessionPort>('SESSION_PORT');
