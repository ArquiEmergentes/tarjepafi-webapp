import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { TranslatePipe } from '@ngx-translate/core';
import { CredentialAction } from '../../../domain/model/credential.entity';
import { StatusChangeReason } from '../../../domain/model/credential-status-change.entity';
import { NOTE_MAX_LENGTH } from '../../../application/credentials.store';

export interface CredentialActionDialogData {
  action: CredentialAction;
  cardUid: string;
  holderName: string | null;
  isStudent: boolean;
}

export interface CredentialActionDialogResult {
  reason?: StatusChangeReason;
  note: string;
}

const ICONS: Record<CredentialAction, string> = {
  BLOCK: 'block',
  REPORT_LOST: 'report',
  DEACTIVATE: 'do_not_disturb_on',
  REACTIVATE: 'restart_alt',
};

/** Confirmación de un cambio de estado de tarjeta, con motivo cuando la regla lo exige. */
@Component({
  selector: 'tp-credential-action-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatRadioModule, FormsModule, TranslatePipe],
  template: `
    <div class="head">
      <span class="icon" [class.icon--danger]="destructive">
        <mat-icon>{{ icon }}</mat-icon>
      </span>
      <h2 mat-dialog-title>{{ 'credentials.actions.' + data.action + '.title' | translate }}</h2>
    </div>
    <mat-dialog-content>
      <p class="message">
        {{ 'credentials.actions.' + data.action + '.message' | translate: { uid: data.cardUid, holder: data.holderName ?? ('credentials.unlinked' | translate) } }}
      </p>
      @if (data.action === 'REACTIVATE' && data.isStudent) {
        <p class="hint"><mat-icon>info</mat-icon>{{ 'credentials.actions.REACTIVATE.studentHint' | translate }}</p>
      }

      @if (data.action === 'DEACTIVATE') {
        <p class="label">{{ 'credentials.fields.reason' | translate }}</p>
        <mat-radio-group class="reasons" [ngModel]="reason()" (ngModelChange)="reason.set($event)">
          <mat-radio-button value="WITHDRAWAL">{{ 'credentials.reasons.WITHDRAWAL' | translate }}</mat-radio-button>
          <mat-radio-button value="MANUAL">{{ 'credentials.reasons.MANUAL' | translate }}</mat-radio-button>
        </mat-radio-group>
      }

      @if (data.action !== 'REACTIVATE') {
        <mat-form-field class="note">
          <mat-label>{{ (noteRequired ? 'credentials.fields.noteRequired' : 'credentials.fields.noteOptional') | translate }}</mat-label>
          <textarea
            matInput
            rows="3"
            [maxLength]="max"
            [ngModel]="note()"
            (ngModelChange)="note.set($event)"
            (blur)="touched.set(true)"
          ></textarea>
          <mat-hint align="end">{{ note().length }} / {{ max }}</mat-hint>
        </mat-form-field>
        @if (touched() && !valid()) {
          <p class="error" role="alert"><mat-icon>error</mat-icon>{{ 'common.reasonRequired' | translate }}</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button type="button" [class.tp-btn-danger]="destructive" [disabled]="!valid()" (click)="confirm()">
        {{ 'credentials.actions.' + data.action + '.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; padding: 8px; }
    .head { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
    .head h2 { padding: 0; margin: 0; font-family: var(--tp-font-title); font-size: 20px; font-weight: 600; }
    .icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); flex: none; }
    .icon--danger { background: var(--tp-error-bg); color: var(--tp-error); }
    .message { color: var(--tp-muted); margin: 0 0 16px; font-size: 14px; }
    .hint { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 8px; padding: 12px; border-radius: 8px;
      background: var(--tp-info-bg); color: #1d4ed8; font-size: 13px; }
    .hint mat-icon { font-size: 18px; width: 18px; height: 18px; flex: none; }
    .label { margin: 0 0 4px; font-size: 12px; font-weight: 500; color: var(--tp-muted); }
    .reasons { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .note { width: 100%; }
    .error { display: flex; align-items: center; gap: 4px; color: var(--tp-error); font-size: 12px; font-weight: 500; margin: 4px 0 0; }
    .error mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class CredentialActionDialog {
  protected readonly data = inject<CredentialActionDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CredentialActionDialog, CredentialActionDialogResult>>(MatDialogRef);

  protected readonly icon = ICONS[this.data.action];
  protected readonly destructive = this.data.action !== 'REACTIVATE';
  protected readonly noteRequired = this.data.action === 'BLOCK';
  protected readonly max = NOTE_MAX_LENGTH;

  protected readonly note = signal('');
  protected readonly reason = signal<StatusChangeReason>(this.data.isStudent ? 'WITHDRAWAL' : 'MANUAL');
  protected readonly touched = signal(false);
  protected readonly valid = computed(() => !this.noteRequired || this.note().trim().length > 0);

  protected confirm(): void {
    if (!this.valid()) {
      this.touched.set(true);
      return;
    }
    this.ref.close({
      reason: this.data.action === 'DEACTIVATE' ? this.reason() : undefined,
      note: this.note().trim(),
    });
  }
}
