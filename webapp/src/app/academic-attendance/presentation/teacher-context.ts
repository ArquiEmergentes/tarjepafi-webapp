import { computed, inject } from '@angular/core';
import { SESSION_PORT } from '../../shared/application/session.port';

/** cardHolderId del docente autenticado (las vistas del docente solo ven sus propios datos). */
export function injectTeacherId() {
  const session = inject(SESSION_PORT);
  return computed(() => session.user()?.cardHolderId ?? null);
}
