import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { SESSION_PORT } from '../../../../shared/application/session.port';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { CredentialsStore } from '../../../application/credentials.store';
import { CredentialAction } from '../../../domain/model/credential.entity';
import { CredentialStatusChange, SYSTEM_ACTOR } from '../../../domain/model/credential-status-change.entity';
import { CredentialPermissions } from '../../components/credential-permissions/credential-permissions';
import { CredentialActions } from '../../credential-actions.service';

/** A2 · Detalle de credencial: acciones, titular, historial de estados y permisos. */
@Component({
  selector: 'tp-credential-detail',
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, MatTabsModule, TranslatePipe,
    EmptyState, PageHeader, Skeleton, StatusBadge, CredentialPermissions,
  ],
  templateUrl: './credential-detail.html',
  styleUrl: './credential-detail.scss',
})
export class CredentialDetailPage {
  /** Parámetro de ruta `:credentialId`. */
  readonly credentialId = input.required<string>();

  private readonly store = inject(CredentialsStore);
  private readonly actions = inject(CredentialActions);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SESSION_PORT);
  protected readonly lang = inject(LanguageService);

  protected readonly row = computed(() => this.store.row(this.credentialId()));
  protected readonly loading = computed(() => !this.store.loaded() && !this.store.loadError());
  protected readonly failed = computed(() => this.store.loadError() && !this.store.loaded());

  protected readonly history = signal<CredentialStatusChange[]>([]);
  protected readonly historyLoading = signal(true);
  protected readonly historyFailed = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    void this.reload();
    effect(() => {
      void this.loadHistory(this.credentialId());
    });
  }

  protected async reload(): Promise<void> {
    await this.store.ensureLoaded();
    if (this.store.loadError() && !this.store.loaded()) {
      this.toast.errorWithRetry('common.loadError', () => void this.store.load());
    }
  }

  protected async loadHistory(id: string): Promise<void> {
    this.historyLoading.set(true);
    this.historyFailed.set(false);
    try {
      this.history.set(await firstValueFrom(this.store.history(id)));
    } catch {
      this.historyFailed.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected date(value: LocalDateTime | null): Date | null {
    return toDisplayDate(value);
  }

  protected actorLabel(change: CredentialStatusChange): string {
    if (change.changedBy === SYSTEM_ACTOR) return 'credentials.history.system';
    const me = this.session.user();
    return me && me.id === change.changedBy ? me.fullName : change.changedBy;
  }

  protected async run(action: CredentialAction): Promise<void> {
    const row = this.row();
    if (!row) return;
    this.busy.set(true);
    if (await this.actions.run(row, action)) await this.loadHistory(row.credential.id);
    this.busy.set(false);
  }

  protected async link(): Promise<void> {
    const row = this.row();
    if (!row) return;
    this.busy.set(true);
    if (await this.actions.link(row)) await this.loadHistory(row.credential.id);
    this.busy.set(false);
  }
}
