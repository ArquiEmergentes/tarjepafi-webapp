import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { CredentialError, CredentialsStore } from '../../../application/credentials.store';
import { CardHolder } from '../../../domain/model/card-holder.entity';

export interface LinkHolderDialogData {
  credentialId: string;
  cardUid: string;
  currentHolder: CardHolder | null;
}

/** Vincular o actualizar el titular de una tarjeta (US11). Busca por código y confirma. */
@Component({
  selector: 'tp-link-holder-dialog',
  imports: [
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule,
    FormsModule, TranslatePipe, StatusBadge,
  ],
  template: `
    <div class="head">
      <span class="icon"><mat-icon>link</mat-icon></span>
      <h2 mat-dialog-title>{{ (data.currentHolder ? 'credentials.link.updateTitle' : 'credentials.link.title') | translate }}</h2>
    </div>
    <mat-dialog-content>
      <p class="message">{{ 'credentials.link.message' | translate: { uid: data.cardUid } }}</p>
      @if (data.currentHolder; as h) {
        <p class="current">{{ 'credentials.link.current' | translate }}: <strong>{{ h.fullName }}</strong> · {{ h.code }}</p>
      }

      <form class="search" (ngSubmit)="search()">
        <mat-form-field>
          <mat-label>{{ 'credentials.link.code' | translate }}</mat-label>
          <input matInput name="code" [ngModel]="code()" (ngModelChange)="code.set($event); found.set(null); error.set(null)"
            placeholder="U202312966 · D0001 · T0001" autocomplete="off" />
        </mat-form-field>
        <button mat-stroked-button type="submit" [disabled]="!code().trim() || busy()">
          <mat-icon>search</mat-icon>{{ 'common.search' | translate }}
        </button>
      </form>

      @if (error(); as e) {
        <p class="error" role="alert"><mat-icon>error</mat-icon>{{ 'credentials.errors.' + e | translate: errorParams() }}</p>
      }

      @if (found(); as h) {
        <article class="holder">
          <div>
            <strong>{{ h.fullName }}</strong>
            <span>{{ h.code }} · {{ h.email }}</span>
            <span>{{ h.program }}</span>
          </div>
          <div class="badges">
            <tp-status-badge kind="role" [status]="h.role" />
            @if (h.enrollmentStatus) {
              <tp-status-badge kind="enrollment" [status]="h.enrollmentStatus" />
            }
          </div>
        </article>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button type="button" [disabled]="!found() || busy()" (click)="confirm()">
        @if (busy()) {
          <mat-spinner diameter="18" />
        }
        {{ 'credentials.link.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; padding: 8px; }
    .head { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
    .head h2 { padding: 0; margin: 0; font-family: var(--tp-font-title); font-size: 20px; font-weight: 600; }
    .icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); flex: none; }
    .message { color: var(--tp-muted); margin: 0 0 8px; font-size: 14px; }
    .current { margin: 0 0 16px; font-size: 13px; color: var(--tp-muted); }
    .search { display: flex; gap: 8px; align-items: flex-start; }
    .search mat-form-field { flex: 1; }
    .search button { margin-top: 6px; }
    .holder { display: flex; justify-content: space-between; gap: 16px; padding: 16px; margin-top: 16px; border-radius: 12px;
      border: 1px solid var(--tp-border-soft); background: var(--tp-bg); }
    .holder div:first-child { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--tp-muted); }
    .holder strong { color: var(--tp-text); font-size: 14px; }
    .badges { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .error { display: flex; align-items: center; gap: 4px; color: var(--tp-error); font-size: 12px; font-weight: 500; margin: 4px 0 0; }
    .error mat-icon { font-size: 16px; width: 16px; height: 16px; }
    mat-spinner { display: inline-block; margin-right: 8px; }
  `,
})
export class LinkHolderDialog {
  protected readonly data = inject<LinkHolderDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<LinkHolderDialog, CardHolder>>(MatDialogRef);
  private readonly store = inject(CredentialsStore);

  protected readonly code = signal('');
  protected readonly found = signal<CardHolder | null>(null);
  protected readonly error = signal<CredentialError | null>(null);
  protected readonly errorParams = signal<Record<string, unknown>>({});
  protected readonly busy = signal(false);

  protected async search(): Promise<void> {
    if (!this.code().trim()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const holder = await this.store.findHolderByCode(this.code());
      this.found.set(holder);
      if (!holder) this.error.set('HOLDER_NOT_FOUND');
    } catch {
      this.error.set('SAVE_FAILED');
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const holder = this.found();
    if (!holder) return;
    this.busy.set(true);
    const result = await this.store.link(this.data.credentialId, holder.code);
    this.busy.set(false);
    if (result.ok) {
      this.ref.close(result.value);
    } else {
      this.errorParams.set(result.params ?? {});
      this.error.set(result.error);
    }
  }
}
