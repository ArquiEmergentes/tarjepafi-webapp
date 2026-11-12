import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessionPort, SessionUser } from '../../shared/application/session.port';
import { EmailAddress } from '../domain/model/email-address';
import { User, UserProps } from '../domain/model/user.entity';
import { UsersApiEndpoint } from '../infrastructure/users-api-endpoint';

export type SignInError = 'INVALID_EMAIL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'NETWORK';
export type SignInResult = { ok: true; user: User } | { ok: false; error: SignInError };

const STORAGE_KEY = 'tp.session';

/** Sesión del usuario autenticado. Implementa el puerto que usa el layout compartido. */
@Injectable({ providedIn: 'root' })
export class AuthStore implements SessionPort {
  private readonly api = inject(UsersApiEndpoint);
  private readonly current = signal<User | null>(null);

  readonly currentUser = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);
  readonly user = computed<SessionUser | null>(() => {
    const u = this.current();
    return u ? { id: u.id, fullName: u.fullName, email: u.email, role: u.role, cardHolderId: u.cardHolderId } : null;
  });

  /** Reglas de acceso (6.A): formato de correo, credenciales y estado de la cuenta. */
  async signIn(rawEmail: string, password: string, remember: boolean): Promise<SignInResult> {
    const email = EmailAddress.create(rawEmail);
    if (!email) return { ok: false, error: 'INVALID_EMAIL' };

    let user: User | null;
    try {
      user = await firstValueFrom(this.api.verifyCredentials(email.value, password));
    } catch {
      return { ok: false, error: 'NETWORK' };
    }
    if (!user) return { ok: false, error: 'INVALID_CREDENTIALS' };
    if (!user.isEnabled()) return { ok: false, error: 'ACCOUNT_DISABLED' };

    this.current.set(user);
    this.persist(user, remember);
    return { ok: true, user };
  }

  signOut(): void {
    this.current.set(null);
    for (const storage of this.storages()) {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // nada que limpiar
      }
    }
  }

  /** Restaura la sesión guardada y la revalida en segundo plano contra la API. */
  restore(): void {
    for (const storage of this.storages()) {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) continue;
        const user = new User(JSON.parse(raw) as UserProps);
        this.current.set(user);
        this.revalidate(user.id);
        return;
      } catch {
        // sesión corrupta o almacenamiento bloqueado: se ignora
      }
    }
  }

  private revalidate(id: string): void {
    this.api.getById(id).subscribe({
      next: (fresh) => {
        if (!fresh.isEnabled()) this.signOut();
        else this.current.set(fresh);
      },
      error: () => {
        // sin API disponible se mantiene la sesión local; las vistas mostrarán su propio error
      },
    });
  }

  private persist(user: User, remember: boolean): void {
    try {
      (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(user.toProps()));
    } catch {
      // la sesión vive solo en memoria
    }
  }

  private storages(): Storage[] {
    try {
      return [sessionStorage, localStorage];
    } catch {
      return [];
    }
  }
}
