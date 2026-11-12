import { InjectionToken, Signal } from '@angular/core';
import { SessionRole } from './session.port';

export interface AppNotification {
  id: string;
  icon: string;
  tone: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  route?: string;
}

/**
 * Fuente de notificaciones para la campana del header. Cada bounded context puede aportar la suya
 * (por ejemplo, IoT Monitoring con incidencias abiertas) sin que el layout lo conozca.
 */
export interface NotificationSource {
  readonly roles: readonly SessionRole[];
  readonly notifications: Signal<AppNotification[]>;
  refresh(): void;
}

export const NOTIFICATION_SOURCES = new InjectionToken<NotificationSource[]>('NOTIFICATION_SOURCES');
