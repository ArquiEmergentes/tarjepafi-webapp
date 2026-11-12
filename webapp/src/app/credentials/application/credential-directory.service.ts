import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LocalDateTime } from '../../shared/domain/date-time';
import { CardHolder, HolderRole } from '../domain/model/card-holder.entity';
import { Credential } from '../domain/model/credential.entity';
import { AccessResolution, resolveAccess } from '../domain/model/credential-permission.entity';
import { AcademicSystemCardHoldersApi } from '../infrastructure/academic-system-card-holders-api';
import { CredentialPermissionsApiEndpoint, CredentialsApiEndpoint } from '../infrastructure/credentials-api-endpoints';

export interface CardLookup {
  credential: Credential;
  holder: CardHolder | null;
}

/**
 * Servicio de aplicación que Credentials ofrece a los demás contextos: buscar una tarjeta por UID,
 * consultar titulares, evaluar permisos (US14) y registrar el último uso. Nadie más escribe en `credentials`.
 */
@Injectable({ providedIn: 'root' })
export class CredentialDirectory {
  private readonly credentialsApi = inject(CredentialsApiEndpoint);
  private readonly permissionsApi = inject(CredentialPermissionsApiEndpoint);
  private readonly holdersApi = inject(AcademicSystemCardHoldersApi);

  private readonly holderList = signal<CardHolder[]>([]);
  readonly holders = this.holderList.asReadonly();
  readonly holdersById = computed(() => new Map(this.holderList().map((h) => [h.id, h])));

  async loadHolders(): Promise<CardHolder[]> {
    const list = await firstValueFrom(this.holdersApi.getAll({ _sort: 'fullName' }));
    this.holderList.set(list);
    return list;
  }

  async ensureHolders(): Promise<void> {
    if (this.holderList().length === 0) await this.loadHolders();
  }

  credentials(): Promise<Credential[]> {
    return firstValueFrom(this.credentialsApi.getAll());
  }

  /** Tarjeta por UID (sin distinguir mayúsculas). null si no está registrada. */
  async findByUid(cardUid: string): Promise<CardLookup | null> {
    const uid = cardUid.trim().toUpperCase();
    const [credential] = await firstValueFrom(this.credentialsApi.getAll({ cardUid: uid }));
    if (!credential) return null;
    let holder: CardHolder | null = null;
    if (credential.cardHolderId) {
      holder = this.holdersById().get(credential.cardHolderId) ?? null;
      if (!holder) {
        try {
          holder = await firstValueFrom(this.holdersApi.getById(credential.cardHolderId));
        } catch {
          holder = null;
        }
      }
    }
    return { credential, holder };
  }

  /** Tarjeta vigente (o la más reciente) de un titular, para su perfil. */
  async credentialOf(cardHolderId: string): Promise<Credential | null> {
    const list = await firstValueFrom(this.credentialsApi.getAll({ cardHolderId }));
    return list.find((c) => c.isActive()) ?? [...list].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0] ?? null;
  }

  /** Regla 6.B · US14: excepción de la tarjeta para el espacio o, si no hay, roles permitidos del espacio. */
  async resolveAccess(credentialId: string, spaceId: string, role: HolderRole | null, allowedRoles: readonly HolderRole[]): Promise<AccessResolution> {
    const [exception] = await firstValueFrom(this.permissionsApi.getAll({ credentialId, spaceId }));
    return resolveAccess(exception, allowedRoles, role);
  }

  /** Paso 5 del flujo de lectura: toda lectura actualiza `credentials.lastUsedAt`. */
  async markUsed(credential: Credential, at: LocalDateTime): Promise<void> {
    await firstValueFrom(this.credentialsApi.update(new Credential({ ...credential.toProps(), lastUsedAt: at })));
  }
}
