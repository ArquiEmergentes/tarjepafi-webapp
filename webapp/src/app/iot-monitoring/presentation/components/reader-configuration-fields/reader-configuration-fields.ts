import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldError } from '../../../../shared/presentation/components/field-error/field-error';
import { ReaderError } from '../../../application/readers.store';
import { ReaderConfiguration, ReaderMode } from '../../../domain/model/reader-configuration';

export interface ReaderConfigurationDraft {
  readerMode: ReaderMode | null;
  communicationInterval: number | null;
  heartbeatInterval: number | null;
  firmwareVersion: string;
}

export function toDraft(config: ReaderConfiguration): ReaderConfigurationDraft {
  return { ...config };
}

export function fromDraft(draft: ReaderConfigurationDraft): Partial<ReaderConfiguration> {
  return {
    readerMode: draft.readerMode ?? undefined,
    communicationInterval: draft.communicationInterval ?? undefined,
    heartbeatInterval: draft.heartbeatInterval ?? undefined,
    firmwareVersion: draft.firmwareVersion,
  };
}

const FIELD_ERRORS: Record<string, readonly ReaderError[]> = {
  readerMode: ['MODE_REQUIRED'],
  communicationInterval: ['COMMUNICATION_INTERVAL_INVALID'],
  heartbeatInterval: ['HEARTBEAT_INTERVAL_INVALID', 'HEARTBEAT_LOWER_THAN_COMMUNICATION'],
  firmwareVersion: ['FIRMWARE_FORMAT'],
};

/** Campos de configuración de un lector (registro y pestaña Configuración). */
@Component({
  selector: 'tp-reader-configuration-fields',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe, FieldError],
  template: `
    <div class="grid">
      <div>
        <mat-form-field>
          <mat-label>{{ 'readers.config.readerMode' | translate }}</mat-label>
          <mat-select [ngModel]="value().readerMode" (ngModelChange)="patch({ readerMode: $event })" [disabled]="disabled()">
            <mat-option value="ATTENDANCE">{{ 'readers.modes.ATTENDANCE' | translate }}</mat-option>
            <mat-option value="ACCESS_CONTROL">{{ 'readers.modes.ACCESS_CONTROL' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
        <tp-field-error [message]="error('readerMode')" />
      </div>
      <div>
        <mat-form-field>
          <mat-label>{{ 'readers.config.firmwareVersion' | translate }}</mat-label>
          <input matInput [ngModel]="value().firmwareVersion" (ngModelChange)="patch({ firmwareVersion: $event })" placeholder="2.4.1" [disabled]="disabled()" />
        </mat-form-field>
        <tp-field-error [message]="error('firmwareVersion')" />
      </div>
      <div>
        <mat-form-field>
          <mat-label>{{ 'readers.config.communicationInterval' | translate }}</mat-label>
          <input matInput type="number" min="1" [ngModel]="value().communicationInterval" (ngModelChange)="patch({ communicationInterval: $event })" [disabled]="disabled()" />
          <span matTextSuffix>s</span>
        </mat-form-field>
        <tp-field-error [message]="error('communicationInterval')" />
      </div>
      <div>
        <mat-form-field>
          <mat-label>{{ 'readers.config.heartbeatInterval' | translate }}</mat-label>
          <input matInput type="number" min="1" [ngModel]="value().heartbeatInterval" (ngModelChange)="patch({ heartbeatInterval: $event })" [disabled]="disabled()" />
          <span matTextSuffix>s</span>
        </mat-form-field>
        <tp-field-error [message]="error('heartbeatInterval')" />
      </div>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 16px; }
    mat-form-field { width: 100%; }
  `,
})
export class ReaderConfigurationFields {
  readonly value = model.required<ReaderConfigurationDraft>();
  /** Mensajes ya traducidos por código de error. */
  readonly errors = input<Partial<Record<ReaderError, string>>>({});
  readonly disabled = input(false);

  protected patch(changes: Partial<ReaderConfigurationDraft>): void {
    this.value.update((v) => ({ ...v, ...changes }));
  }

  protected error(field: string): string | null {
    const found = FIELD_ERRORS[field]?.find((code) => this.errors()[code]);
    return found ? (this.errors()[found] ?? null) : null;
  }
}
