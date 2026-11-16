import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SessionPort, SessionUser } from '../../shared/application/session.port';
import { EmailAddress } from '../domain/model/email-address';
import { User, UserProps } from '../domain/model/user.entity';
import { SignedIn, UsersApiEndpoint } from '../infrastructure/users-api-endpoint';

export type SignInError = 'INVALID_EMAIL' | 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'NETWORK';
export type SignInResult = { ok: true; user: User } | { ok: false; error: SignInError };

const STORAGE_KEY = 'tp.session';

interface StoredSession {
  token: string;
  user: UserProps;
}

/** Sesión del usuario autenticado. Implementa el puerto que usa el layout compartido. */
@Injectable({ providedIn: 'root' })
export class AuthStore implements SessionPort {
  private readonly api = inject(UsersApiEndpoint);
  private readonly current = signal<User | null>(null);
  private readonly accessToken = signal<string | null>(null);

  /** Bearer token for the backend; null when signed out. */
  readonly token = this.accessToken.asReadonly();
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

    let signedIn: SignedIn;
    try {
      signedIn = await firstValueFrom(this.api.signIn(email.value, password));
    } catch (error) {
      return { ok: false, error: this.toSignInError(error) };
    }
    const { token, user } = signedIn;
    if (!user.isEnabled()) return { ok: false, error: 'ACCOUNT_DISABLED' };

    this.accessToken.set(token);
    this.current.set(user);
    this.persist(user, token, remember);
    return { ok: true, user };
  }

  signOut(): void {
    this.current.set(null);
    this.accessToken.set(null);
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
        const saved = JSON.parse(raw) as Partial<StoredSession>;
        // A session saved before the backend existed has no token: it cannot be used any more.
        if (!saved.token || !saved.user) {
          storage.removeItem(STORAGE_KEY);
          continue;
        }
        this.accessToken.set(saved.token);
        this.current.set(new User(saved.user));
        this.revalidate();
        return;
      } catch {
        // sesión corrupta o almacenamiento bloqueado: se ignora
      }
    }
  }

  /** `GET auth/me`: a 401 is handled by the interceptor (it signs out); a disabled account signs out here. */
  private revalidate(): void {
    this.api.me().subscribe({
      next: (fresh) => {
        if (!fresh.isEnabled()) this.signOut();
        else {
          this.current.set(fresh);
          this.refreshStoredUser(fresh);
        }
      },
      error: () => {
        // sin API disponible se mantiene la sesión local; las vistas mostrarán su propio error
      },
    });
  }

  private toSignInError(error: unknown): SignInError {
    if (!(error instanceof HttpErrorResponse)) return 'NETWORK';
    const code = (error.error as { code?: string } | null)?.code;
    if (code === 'INVALID_EMAIL' || code === 'INVALID_CREDENTIALS' || code === 'ACCOUNT_DISABLED') return code;
    if (error.status === 401) return 'INVALID_CREDENTIALS';
    if (error.status === 403) return 'ACCOUNT_DISABLED';
    return 'NETWORK';
  }

  private persist(user: User, token: string, remember: boolean): void {
    try {
      const session: StoredSession = { token, user: user.toProps() };
      (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // la sesión vive solo en memoria
    }
  }

  private refreshStoredUser(user: User): void {
    const token = this.accessToken();
    if (!token) return;
    for (const storage of this.storages()) {
      try {
        if (storage.getItem(STORAGE_KEY)) {
          storage.setItem(STORAGE_KEY, JSON.stringify({ token, user: user.toProps() } satisfies StoredSession));
        }
      } catch {
        // nada que actualizar
      }
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
