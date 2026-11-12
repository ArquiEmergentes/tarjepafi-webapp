import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { Space } from '../../../../space-facility/domain/model/space.entity';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { DialogService } from '../../../../shared/presentation/services/dialog.service';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { CredentialsStore } from '../../../application/credentials.store';
import { HolderRole } from '../../../domain/model/card-holder.entity';
import { AccessResolution, CredentialPermission, PermissionEffect, resolveAccess } from '../../../domain/model/credential-permission.entity';

interface SpaceAccessRow {
  space: Space;
  exception: CredentialPermission | undefined;
  access: AccessResolution;
}

/** Pestaña Permisos (US14): excepciones por tarjeta y acceso efectivo a cada espacio. */
@Component({
  selector: 'tp-credential-permissions',
  imports: [
    FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatTooltipModule, TranslatePipe,
    EmptyState, Skeleton, StatusBadge,
  ],
  template: `
    <p class="rule"><mat-icon>rule</mat-icon>{{ 'credentials.permissions.rule' | translate }}</p>

    @if (loading()) {
      <tp-skeleton variant="table" [count]="6" />
    } @else if (failed()) {
      <tp-empty-state icon="cloud_off" tone="error" [title]="'common.loadErrorTitle' | translate" [message]="'common.loadError' | translate">
        <button mat-flat-button type="button" (click)="load()"><mat-icon>refresh</mat-icon>{{ 'common.retry' | translate }}</button>
      </tp-empty-state>
    } @else {
      <form class="add" (ngSubmit)="add()">
        <mat-form-field class="space">
          <mat-label>{{ 'credentials.permissions.space' | translate }}</mat-label>
          <mat-select name="space" [ngModel]="spaceId()" (ngModelChange)="spaceId.set($event)">
            @for (s of spaces(); track s.id) {
              <mat-option [value]="s.id">{{ s.code }} · {{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field class="effect">
          <mat-label>{{ 'credentials.permissions.effect' | translate }}</mat-label>
          <mat-select name="effect" [ngModel]="effect()" (ngModelChange)="effect.set($event)">
            <mat-option value="ALLOW">{{ 'credentials.permissions.effects.ALLOW' | translate }}</mat-option>
            <mat-option value="DENY">{{ 'credentials.permissions.effects.DENY' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="!spaceId() || busy()">
          <mat-icon>add</mat-icon>{{ 'credentials.permissions.add' | translate }}
        </button>
      </form>

      @if (!holderRole()) {
        <p class="note">{{ 'credentials.permissions.unlinkedNote' | translate }}</p>
      }

      <div class="tp-table-wrap">
        <table class="tp-table">
          <thead>
            <tr>
              <th>{{ 'credentials.permissions.space' | translate }}</th>
              <th>{{ 'credentials.permissions.allowedRoles' | translate }}</th>
              <th>{{ 'credentials.permissions.exception' | translate }}</th>
              <th>{{ 'credentials.permissions.effective' | translate }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.space.id) {
              <tr [class.has-exception]="r.exception">
                <td>
                  <span class="space-name"><strong>{{ r.space.code }}</strong><small>{{ r.space.name }}</small></span>
                </td>
                <td>
                  <span class="roles">
                    @for (role of r.space.allowedRoles; track role) {
                      <span class="chip">{{ 'roles.' + role | translate }}</span>
                    }
                  </span>
                </td>
                <td>
                  @if (r.exception; as e) {
                    <tp-status-badge kind="decision" [status]="e.allows() ? 'GRANTED' : 'DENIED'" [label]="'credentials.permissions.effects.' + e.effect" />
                  } @else {
                    <span class="tp-muted">—</span>
                  }
                </td>
                <td>
                  <span class="effective">
                    <tp-status-badge kind="decision" [status]="r.access.allowed ? 'GRANTED' : 'DENIED'" />
                    <small>{{ 'credentials.permissions.basis.' + r.access.basis | translate }}</small>
                  </span>
                </td>
                <td class="end">
                  @if (r.exception; as e) {
                    <button mat-icon-button type="button" (click)="remove(e, r.space)" [disabled]="busy()"
                      [matTooltip]="'credentials.permissions.remove' | translate" [attr.aria-label]="'credentials.permissions.remove' | translate">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 16px; padding-top: 16px; }
    .rule { display: flex; gap: 8px; align-items: center; margin: 0 24px; padding: 12px 16px; border-radius: 8px; background: var(--tp-brand-light);
      color: var(--tp-cyan-text); font-size: 13px; font-weight: 500; }
    .rule mat-icon { font-size: 20px; width: 20px; height: 20px; flex: none; }
    .add { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; padding: 0 24px; }
    .add .space { flex: 1; min-width: 260px; max-width: 420px; }
    .add .effect { width: 200px; }
    .add button { margin-top: 6px; }
    .note { margin: 0 24px; font-size: 13px; color: var(--tp-warning-text); }
    .space-name { display: flex; flex-direction: column; line-height: 1.3; }
    .space-name small { color: var(--tp-muted); font-size: 12px; }
    .roles { display: flex; gap: 4px; flex-wrap: wrap; }
    .chip { padding: 2px 8px; border-radius: 999px; background: var(--tp-neutral-bg); color: var(--tp-muted); font-size: 12px; font-weight: 500; }
    .effective { display: flex; align-items: center; gap: 8px; }
    .effective small { color: var(--tp-muted); font-size: 12px; }
    tr.has-exception td { background: #fbfdff; }
    .end { text-align: right; width: 56px; }
  `,
})
export class CredentialPermissions implements OnInit {
  readonly credentialId = input.required<string>();
  readonly holderRole = input<HolderRole | null>(null);

  private readonly store = inject(CredentialsStore);
  private readonly catalog = inject(SpaceCatalog);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly spaces = this.catalog.spaces;
  protected readonly permissions = signal<CredentialPermission[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly spaceId = signal<string | null>(null);
  protected readonly effect = signal<PermissionEffect>('ALLOW');

  protected readonly rows = computed<SpaceAccessRow[]>(() => {
    const bySpace = new Map(this.permissions().map((p) => [p.spaceId, p]));
    return this.spaces().map((space) => {
      const exception = bySpace.get(space.id);
      return { space, exception, access: resolveAccess(exception, space.allowedRoles, this.holderRole()) };
    });
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      const { permissions } = await firstValueFrom(
        forkJoin({ spaces: this.catalog.load(), permissions: this.store.permissions(this.credentialId()) }),
      );
      this.permissions.set(permissions);
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  protected async add(): Promise<void> {
    const spaceId = this.spaceId();
    if (!spaceId) return;
    this.busy.set(true);
    const result = await this.store.setPermission(this.credentialId(), spaceId, this.effect());
    this.busy.set(false);
    if (!result.ok) {
      this.toast.error(`credentials.errors.${result.error}`);
      return;
    }
    this.permissions.update((list) => [...list.filter((p) => p.spaceId !== spaceId), result.value]);
    this.spaceId.set(null);
    this.toast.success('credentials.permissions.saved');
  }

  protected async remove(permission: CredentialPermission, space: Space): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.confirm({
        title: 'credentials.permissions.removeTitle',
        message: 'credentials.permissions.removeMessage',
        params: { space: `${space.code} · ${space.name}` },
        confirmLabel: 'credentials.permissions.remove',
        destructive: true,
        icon: 'delete',
      }),
    );
    if (!confirmed) return;
    this.busy.set(true);
    const result = await this.store.removePermission(permission);
    this.busy.set(false);
    if (!result.ok) {
      this.toast.error(`credentials.errors.${result.error}`);
      return;
    }
    this.permissions.update((list) => list.filter((p) => p.id !== permission.id));
    this.toast.success('credentials.permissions.removed');
  }
}
