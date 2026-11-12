import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { User } from '../domain/model/user.entity';
import { UserAssembler } from './user.assembler';
import { UserResource } from './user.resource';

@Injectable({ providedIn: 'root' })
export class UsersApiEndpoint extends BaseApiEndpoint<User, UserResource> {
  constructor() {
    super(inject(HttpClient), 'users', new UserAssembler());
  }

  /**
   * Simula la verificación que haría el backend: busca por correo y compara la contraseña.
   * Devuelve null si el correo no existe o la contraseña no coincide (sin indicar cuál falló).
   */
  verifyCredentials(email: string, password: string): Observable<User | null> {
    return this.http.get<UserResource[]>(this.endpointUrl, { params: { email } }).pipe(
      map((found) => {
        const match = found.find((u) => u.email === email && u.password === password);
        return match ? this.assembler.toEntityFromResource(match) : null;
      }),
    );
  }
}
