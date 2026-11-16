import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../application/auth.store';

/**
 * Adds `Authorization: Bearer` to calls to the backend (never to json-server) and signs the user out when the
 * backend answers 401. The sign-in call itself is excluded: its 401 means "wrong credentials", not "expired".
 */
export const bearerTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

  const auth = inject(AuthStore);
  const isSignIn = req.url === `${environment.apiBaseUrl}/auth/sign-in`;
  const token = auth.token();
  const request = token && !isSignIn ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!isSignIn && error instanceof HttpErrorResponse && error.status === 401) auth.signOut();
      return throwError(() => error);
    }),
  );
};
