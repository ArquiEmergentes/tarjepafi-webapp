import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { User } from '../domain/model/user.entity';
import { UserAssembler } from './user.assembler';
import { UserResource } from './user.resource';

/** Answer of `POST auth/sign-in`. */
export interface SignInResource {
  token: string;
  user: UserResource;
}

export interface SignedIn {
  token: string;
  user: User;
}

/** Codes the backend puts in its problem documents (`code`), see `AuthController`. */
export type AuthErrorCode = 'INVALID_EMAIL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED';

@Injectable({ providedIn: 'root' })
export class UsersApiEndpoint extends BaseApiEndpoint<User, UserResource> {
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  constructor() {
    super(inject(HttpClient), 'users', new UserAssembler());
  }

  /** `POST auth/sign-in`. Errors are HttpErrorResponse with a problem document carrying `code`. */
  signIn(email: string, password: string): Observable<SignedIn> {
    return this.http.post<SignInResource>(`${this.authUrl}/sign-in`, { email, password }).pipe(
      map((r) => ({ token: r.token, user: this.assembler.toEntityFromResource(r.user) })),
    );
  }

  /** `GET auth/me`: the user the bearer token belongs to. */
  me(): Observable<User> {
    return this.http
      .get<UserResource>(`${this.authUrl}/me`)
      .pipe(map((r) => this.assembler.toEntityFromResource(r)));
  }
}
