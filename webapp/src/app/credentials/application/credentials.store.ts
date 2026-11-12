import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, map } from 'rxjs';
import { DataRecorder } from '../../data-management/application/data-recorder.service';
import { SESSION_PORT } from '../../shared/application/session.port';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { newId } from '../../shared/infrastructure/id-generator';
import { CardHolder } from '../domain/model/card-holder.entity';
import { Credential, CredentialAction, CredentialStatus } from '../domain/model/credential.entity';
import { CredentialPermission, PermissionEffect } from '../domain/model/credential-permission.entity';
import { CredentialStatusChange, StatusChangeReason } from '../domain/model/credential-status-change.entity';
import { AcademicSystemCardHoldersApi } from '../infrastructure/academic-system-card-holders-api';
import {
  CredentialPermissionsApiEndpoint,
  CredentialStatusHistoryApiEndpoint,
  CredentialsApiEndpoint,
} from '../infrastructure/credentials-api-endpoints';

export type CredentialError =
  | 'NOT_ALLOWED'
  | 'NOTE_REQUIRED'
  | 'HOLDER_NOT_FOUND'
  | 'HOLDER_HAS_ACTIVE_CARD'
  | 'ENROLLMENT_NOT_COMPLETED'
  | 'ALREADY_LINKED'
  | 'SAVE_FAILED';

export type CommandResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CredentialError; params?: Record<string, unknown> };

export interface CredentialRow {
  credential: Credential;
  holder: CardHolder | null;
}

export interface StatusChangeInput {
  reason?: StatusChangeReason;
  note?: string;
  /** Por defecto el usuario autenticado; `SYSTEM` para procesos automáticos. */
  actor?: string;
}

export const NOTE_MAX_LENGTH = 255;

/** Estado y casos de uso de Credentials (reglas 6.B). json-server no valida nada: las reglas viven aquí. */
@Injectable({ providedIn: 'root' })
export class CredentialsStore {
  private readonly credentialsApi = inject(CredentialsApiEndpoint);
  private readonly historyApi = inject(CredentialStatusHistoryApiEndpoint);
  private readonly permissionsApi = inject(CredentialPermissionsApiEndpoint);
  private readonly holdersApi = inject(AcademicSystemCardHoldersApi);
  private readonly recorder = inject(DataRecorder);
  private readonly clock = inject(SimulatedClock);
  private readonly session = inject(SESSION_PORT);

  private readonly credentials = signal<Credential[]>([]);
  private readonly holders = signal<CardHolder[]>([]);

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly loaded = signal(false);

  readonly holdersById = computed(() => new Map(this.holders().map((h) => [h.id, h])));
  readonly rows = computed<CredentialRow[]>(() => {
    const byId = this.holdersById();
    return this.credentials().map((credential) => ({
      credential,
      holder: credential.cardHolderId ? (byId.get(credential.cardHolderId) ?? null) : null,
    }));
  });
  readonly countByStatus = computed(() => {
    const counts: Record<CredentialStatus, number> = { ACTIVE: 0, BLOCKED: 0, LOST: 0, DEACTIVATED: 0 };
    for (const c of this.credentials()) counts[c.status]++;
    return counts;
  });
  readonly total = computed(() => this.credentials().length);

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const { credentials, holders } = await firstValueFrom(
        forkJoin({ credentials: this.credentialsApi.getAll(), holders: this.holdersApi.getAll() }),
      );
      this.credentials.set(credentials);
      this.holders.set(holders);
      this.loaded.set(true);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Carga solo si aún no hay datos (las vistas de detalle pueden abrirse directamente). */
  async ensureLoaded(): Promise<void> {
    if (!this.loaded() && !this.loading()) await this.load();
  }

  row(credentialId: string): CredentialRow | undefined {
    return this.rows().find((r) => r.credential.id === credentialId);
  }

  history(credentialId: string): Observable<CredentialStatusChange[]> {
    return this.historyApi
      .getAll({ credentialId })
      .pipe(map((list) => [...list].sort((a, b) => b.changedAt.localeCompare(a.changedAt))));
  }

  permissions(credentialId: string): Observable<CredentialPermission[]> {
    return this.permissionsApi.getAll({ credentialId });
  }

  findHolderByCode(code: string): Promise<CardHolder | null> {
    return firstValueFrom(this.holdersApi.findByCode(code));
  }

  // ---------- Casos de uso ----------

  /** Bloquear, reportar pérdida, dar de baja (US10) o reactivar (US13). */
  async changeStatus(credentialId: string, action: CredentialAction, input: StatusChangeInput = {}): Promise<CommandResult<Credential>> {
    const row = this.row(credentialId);
    if (!row || !row.credential.can(action)) return { ok: false, error: 'NOT_ALLOWED' };
    const { credential, holder } = row;
    const note = input.note?.trim() ?? '';
    if (action === 'BLOCK' && note.length === 0) return { ok: false, error: 'NOTE_REQUIRED' };

    if (action === 'REACTIVATE') {
      if (holder?.hasPendingEnrollment()) return { ok: false, error: 'ENROLLMENT_NOT_COMPLETED' };
      const other = await this.otherActiveCard(holder, credential.id);
      if (other === undefined) return { ok: false, error: 'SAVE_FAILED' };
      if (other) return { ok: false, error: 'HOLDER_HAS_ACTIVE_CARD', params: { uid: other.cardUid } };
    }

    const reason = input.reason ?? this.defaultReason(action, credential, holder);
    const updated = credential.apply(action, this.clock.now());
    return this.persistChange(credential, updated, reason, note.slice(0, NOTE_MAX_LENGTH) || null, input.actor);
  }

  /** Vincula o actualiza el titular de una tarjeta (US11). */
  async link(credentialId: string, holderCode: string): Promise<CommandResult<CardHolder>> {
    const row = this.row(credentialId);
    if (!row) return { ok: false, error: 'NOT_ALLOWED' };
    let holder: CardHolder | null;
    try {
      holder = await this.findHolderByCode(holderCode);
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
    if (!holder) return { ok: false, error: 'HOLDER_NOT_FOUND' };
    if (row.credential.cardHolderId === holder.id) return { ok: false, error: 'ALREADY_LINKED' };

    // Un titular solo puede tener una tarjeta ACTIVE.
    if (row.credential.isActive()) {
      const other = await this.otherActiveCard(holder, row.credential.id);
      if (other === undefined) return { ok: false, error: 'SAVE_FAILED' };
      if (other) return { ok: false, error: 'HOLDER_HAS_ACTIVE_CARD', params: { uid: other.cardUid } };
    }

    const updated = row.credential.linkTo(holder.id);
    const result = await this.persistChange(row.credential, updated, 'MANUAL', `${holder.code} · ${holder.fullName}`, undefined, {
      action: 'LINK',
      fromCardHolderId: row.credential.cardHolderId,
      toCardHolderId: holder.id,
    });
    if (!result.ok) return result;
    if (!this.holdersById().has(holder.id)) this.holders.update((list) => [...list, holder]);
    return { ok: true, value: holder };
  }

  /** Crea o actualiza la excepción de acceso de la tarjeta a un espacio (US14). */
  async setPermission(credentialId: string, spaceId: string, effect: PermissionEffect): Promise<CommandResult<CredentialPermission>> {
    try {
      const existing = (await firstValueFrom(this.permissionsApi.getAll({ credentialId, spaceId })))[0];
      const saved = existing
        ? await firstValueFrom(this.permissionsApi.update(existing.withEffect(effect)))
        : await firstValueFrom(this.permissionsApi.create(new CredentialPermission({ id: newId('perm'), credentialId, spaceId, effect })));
      await firstValueFrom(this.recordChange(credentialId, { action: 'PERMISSION_SET', spaceId, effect }));
      return { ok: true, value: saved };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  async removePermission(permission: CredentialPermission): Promise<CommandResult<null>> {
    try {
      await firstValueFrom(this.permissionsApi.delete(permission.id));
      await firstValueFrom(
        this.recordChange(permission.credentialId, { action: 'PERMISSION_REMOVED', spaceId: permission.spaceId, effect: permission.effect }),
      );
      return { ok: true, value: null };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  // ---------- Internos ----------

  private defaultReason(action: CredentialAction, credential: Credential, holder: CardHolder | null): StatusChangeReason {
    switch (action) {
      case 'REPORT_LOST':
        return 'LOST';
      case 'REACTIVATE':
        return holder?.isStudent() && credential.status === 'DEACTIVATED' ? 'REENROLLMENT' : 'MANUAL';
      default:
        return 'MANUAL';
    }
  }

  /** Otra tarjeta ACTIVE del mismo titular; `undefined` si no se pudo consultar. */
  private async otherActiveCard(holder: CardHolder | null, exceptId: string): Promise<Credential | null | undefined> {
    if (!holder) return null;
    try {
      const active = await firstValueFrom(this.credentialsApi.getAll({ cardHolderId: holder.id, status: 'ACTIVE' }));
      return active.find((c) => c.id !== exceptId) ?? null;
    } catch {
      return undefined;
    }
  }

  /** Guarda la tarjeta y deja constancia en `credentialStatusHistory` y en `dataRecords`. */
  private async persistChange(
    before: Credential,
    after: Credential,
    reason: StatusChangeReason,
    note: string | null,
    actor?: string,
    extra: Record<string, unknown> = {},
  ): Promise<CommandResult<Credential>> {
    const changedAt = this.clock.now();
    const changedBy = actor ?? this.session.user()?.id ?? 'UNKNOWN';
    try {
      const saved = await firstValueFrom(this.credentialsApi.update(after));
      this.credentials.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
      const change = new CredentialStatusChange({
        id: newId('csh'),
        credentialId: saved.id,
        fromStatus: before.status,
        toStatus: saved.status,
        reason,
        changedBy,
        changedAt,
        note,
      });
      // Secuencial: json-server escribe el archivo completo en cada petición.
      await firstValueFrom(this.historyApi.create(change));
      await firstValueFrom(
        this.recordChange(saved.id, { fromStatus: before.status, toStatus: saved.status, reason, changedBy, note, ...extra }),
      );
      return { ok: true, value: saved };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  private recordChange(credentialId: string, payload: Record<string, unknown>) {
    return this.recorder.record({ sourceContext: 'CREDENTIALS', dataType: 'CREDENTIAL_CHANGE', subjectId: credentialId, payload });
  }
}
