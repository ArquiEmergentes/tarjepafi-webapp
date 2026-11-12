import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldError } from '../../../../shared/presentation/components/field-error/field-error';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import {
  AttendanceStatus,
  EDIT_REASON_MAX_LENGTH,
  EditableAttendanceStatus,
} from '../../../domain/model/attendance-record.entity';

export interface EditAttendanceDialogData {
  studentName: string;
  studentCode: string;
  current: AttendanceStatus | null;
}

export interface EditAttendanceDialogResult {
  status: EditableAttendanceStatus;
  reason: string;
}

/** Editar asistencia (regla 6.E): Presente, Tarde o Ausente con motivo obligatorio (máx. 255). */
@Component({
  selector: 'tp-edit-attendance-dialog',
  imports: [
    FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatRadioModule, TranslatePipe,
    FieldError, StatusBadge,
  ],
  template: `
    <div class="head">
      <span class="icon"><mat-icon>edit_note</mat-icon></span>
      <div>
        <h2 mat-dialog-title>{{ 'teacher.edit.title' | translate }}</h2>
        <p>{{ data.studentName }} · {{ data.studentCode }}</p>
      </div>
    </div>
    <mat-dialog-content>
      <p class="current">
        {{ 'teacher.edit.current' | translate }}:
        @if (data.current) {
          <tp-status-badge kind="attendance" [status]="data.current" />
        } @else {
          <strong>{{ 'teacher.session.unmarked' | translate }}</strong>
        }
      </p>
      <p class="label">{{ 'teacher.edit.newStatus' | translate }}</p>
      <mat-radio-group class="statuses" [ngModel]="status()" (ngModelChange)="status.set($event)">
        @for (s of options; track s) {
          <mat-radio-button [value]="s">{{ 'status.attendance.' + s | translate }}</mat-radio-button>
        }
      </mat-radio-group>
      <mat-form-field class="reason">
        <mat-label>{{ 'teacher.edit.reason' | translate }}</mat-label>
        <textarea matInput rows="3" [maxLength]="max" [ngModel]="reason()" (ngModelChange)="reason.set($event)" (blur)="touched.set(true)"
          [placeholder]="'teacher.edit.reasonPlaceholder' | translate"></textarea>
        <mat-hint align="end">{{ reason().length }} / {{ max }}</mat-hint>
      </mat-form-field>
      <tp-field-error [message]="touched() && !reasonValid() ? ('teacher.errors.REASON_REQUIRED' | translate) : null" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button type="button" [disabled]="!valid()" (click)="confirm()">{{ 'teacher.edit.save' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; padding: 8px; }
    .head { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
    .head h2 { padding: 0; margin: 0; font-family: var(--tp-font-title); font-size: 20px; font-weight: 600; }
    .head p { margin: 2px 0 0; color: var(--tp-muted); font-size: 13px; }
    .icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); flex: none; }
    .current { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 13px; color: var(--tp-muted); }
    .label { margin: 0 0 4px; font-size: 12px; font-weight: 500; color: var(--tp-muted); }
    .statuses { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .reason { width: 100%; }
  `,
})
export class EditAttendanceDialog {
  protected readonly data = inject<EditAttendanceDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<EditAttendanceDialog, EditAttendanceDialogResult>>(MatDialogRef);

  protected readonly options: EditableAttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT'];
  protected readonly max = EDIT_REASON_MAX_LENGTH;
  protected readonly status = signal<EditableAttendanceStatus | null>(null);
  protected readonly reason = signal('');
  protected readonly touched = signal(false);
  protected readonly reasonValid = computed(() => {
    const value = this.reason().trim();
    return value.length > 0 && value.length <= this.max;
  });
  protected readonly valid = computed(() => this.status() !== null && this.reasonValid());

  protected confirm(): void {
    const status = this.status();
    if (!status || !this.reasonValid()) {
      this.touched.set(true);
      return;
    }
    this.ref.close({ status, reason: this.reason().trim() });
  }
}
