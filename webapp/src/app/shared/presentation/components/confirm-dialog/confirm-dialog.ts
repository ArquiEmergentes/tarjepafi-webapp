import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  params?: Record<string, unknown>;
  confirmLabel?: string;
  destructive?: boolean;
  icon?: string;
  /** Pide un motivo obligatorio antes de confirmar. */
  reason?: { label: string; maxLength?: number };
}

export interface ConfirmDialogResult {
  confirmed: true;
  reason: string;
}

@Component({
  selector: 'tp-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, FormsModule, TranslatePipe],
  template: `
    <div class="head">
      <span class="icon" [class.icon--danger]="data.destructive">
        <mat-icon>{{ data.icon ?? (data.destructive ? 'warning' : 'help') }}</mat-icon>
      </span>
      <h2 mat-dialog-title>{{ data.title | translate: data.params }}</h2>
    </div>
    <mat-dialog-content>
      <p class="message">{{ data.message | translate: data.params }}</p>
      @if (data.reason; as r) {
        <mat-form-field class="reason">
          <mat-label>{{ r.label | translate }}</mat-label>
          <textarea
            matInput
            rows="3"
            [maxLength]="max()"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            (blur)="touched.set(true)"
          ></textarea>
          <mat-hint align="end">{{ reason().length }} / {{ max() }}</mat-hint>
        </mat-form-field>
        @if (touched() && !reasonValid()) {
          <p class="error" role="alert"><mat-icon>error</mat-icon>{{ 'common.reasonRequired' | translate }}</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">{{ 'common.cancel' | translate }}</button>
      <button
        mat-flat-button
        type="button"
        [class.tp-btn-danger]="data.destructive"
        [disabled]="data.reason && !reasonValid()"
        (click)="confirm()"
      >
        {{ (data.confirmLabel ?? 'common.confirm') | translate }}
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
    .reason { width: 100%; }
    .error { display: flex; align-items: center; gap: 4px; color: var(--tp-error); font-size: 12px; font-weight: 500; margin: 4px 0 0; }
    .error mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ConfirmDialog, ConfirmDialogResult>>(MatDialogRef);

  protected readonly reason = signal('');
  protected readonly touched = signal(false);
  protected readonly max = computed(() => this.data.reason?.maxLength ?? 255);
  protected readonly reasonValid = computed(() => {
    const value = this.reason().trim();
    return value.length > 0 && value.length <= this.max();
  });

  protected confirm(): void {
    if (this.data.reason && !this.reasonValid()) {
      this.touched.set(true);
      return;
    }
    this.ref.close({ confirmed: true, reason: this.reason().trim() });
  }
}
