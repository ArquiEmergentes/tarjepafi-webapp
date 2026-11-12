import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HOME_BY_ROLE } from '../../shared/presentation/layout/navigation';
import { UserRole } from '../domain/model/user.entity';
import { AuthStore } from './auth.store';

/** Sin sesión → login (recordando a dónde quería ir). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Rol incorrecto → "Acceso denegado". */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const user = inject(AuthStore).currentUser();
    return user?.hasRole(...roles) ? true : inject(Router).createUrlTree(['/access-denied']);
  };
}

/** Con sesión, el login redirige al inicio del rol. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(AuthStore).currentUser();
  return user ? inject(Router).createUrlTree([HOME_BY_ROLE[user.role]]) : true;
};

/** Ruta raíz → inicio según el rol (ADMIN → Dashboard, TEACHER → Mis sesiones, otros → Portal próximamente). */
export const homeRedirectGuard: CanActivateFn = () => {
  const user = inject(AuthStore).currentUser();
  return inject(Router).createUrlTree([user ? HOME_BY_ROLE[user.role] : '/login']);
};
