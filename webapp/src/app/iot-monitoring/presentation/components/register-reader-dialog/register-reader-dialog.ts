import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { FieldError } from '../../../../shared/presentation/components/field-error/field-error';
import { ReaderError, ReadersStore } from '../../../application/readers.store';
import { DEVICE_TYPES, DeviceType, Reader } from '../../../domain/model/reader.entity';
import {
  ReaderConfigurationDraft,
  ReaderConfigurationFields,
  fromDraft,
} from '../reader-configuration-fields/reader-configuration-fields';

/** Alta de lector (regla 6.C · registro). */
@Component({
  selector: 'tp-register-reader-dialog',
  imports: [
    FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, TranslatePipe, FieldError, ReaderConfigurationFields,
  ],
  template: `
    <div class="head">
      <span class="icon"><mat-icon>add_circle</mat-icon></span>
      <div>
        <h2 mat-dialog-title>{{ 'readers.register.title' | translate }}</h2>
        <p>{{ 'readers.register.subtitle' | translate }}</p>
      </div>
    </div>
    <mat-dialog-content>
      @if (errorMessages()['SAVE_FAILED']; as e) {
        <p class="banner" role="alert"><mat-icon>error</mat-icon>{{ e }}</p>
      }
      <div class="grid">
        <div>
          <mat-form-field>
            <mat-label>{{ 'readers.fields.id' | translate }}</mat-label>
            <input matInput [ngModel]="id()" (ngModelChange)="id.set($event)" placeholder="RDR-A-304" autocomplete="off" />
            <mat-hint>{{ 'readers.register.idHint' | translate }}</mat-hint>
          </mat-form-field>
          <tp-field-error [message]="errorMessages()['ID_FORMAT'] ?? errorMessages()['ID_TAKEN'] ?? null" />
        </div>
        <div>
          <mat-form-field>
            <mat-label>{{ 'readers.fields.name' | translate }}</mat-label>
            <input matInput [ngModel]="name()" (ngModelChange)="name.set($event)" [placeholder]="'readers.register.namePlaceholder' | translate" />
          </mat-form-field>
          <tp-field-error [message]="errorMessages()['NAME_REQUIRED'] ?? null" />
        </div>
        <div>
          <mat-form-field>
            <mat-label>{{ 'readers.fields.type' | translate }}</mat-label>
            <mat-select [ngModel]="deviceType()" (ngModelChange)="onType($event)">
              @for (t of types; track t) {
                <mat-option [value]="t">{{ 'readers.types.' + t | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <tp-field-error [message]="errorMessages()['TYPE_REQUIRED'] ?? null" />
        </div>
        <div>
          <mat-form-field>
            <mat-label>{{ 'readers.fields.location' | translate }}</mat-label>
            <mat-select [ngModel]="spaceId()" (ngModelChange)="spaceId.set($event)">
              @for (s of spaces(); track s.id) {
                <mat-option [value]="s.id">{{ s.code }} · {{ s.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <tp-field-error [message]="errorMessages()['SPACE_REQUIRED'] ?? null" />
        </div>
      </div>
      <h3>{{ 'readers.detail.configuration' | translate }}</h3>
      <tp-reader-configuration-fields [(value)]="config" [errors]="errorMessages()" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button type="button" [disabled]="busy()" (click)="submit()">
        @if (busy()) {
          <mat-spinner diameter="18" />
        }
        {{ 'readers.register.submit' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; padding: 8px; }
    .head { display: flex; align-items: center; gap: 12px; padding: 16px 24px 0; }
    .head h2 { padding: 0; margin: 0; font-family: var(--tp-font-title); font-size: 20px; font-weight: 600; }
    .head p { margin: 2px 0 0; color: var(--tp-muted); font-size: 13px; }
    .icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); flex: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 16px; padding-top: 8px; }
    mat-form-field { width: 100%; }
    h3 { font-size: 14px; margin: 16px 0 8px; }
    .banner { display: flex; gap: 8px; align-items: center; padding: 12px 16px; border-radius: 8px; background: var(--tp-error-bg);
      color: #b91c1c; font-size: 13px; font-weight: 500; margin: 8px 0 0; }
    mat-spinner { display: inline-block; margin-right: 8px; }
  `,
})
export class RegisterReaderDialog {
  private readonly store = inject(ReadersStore);
  private readonly catalog = inject(SpaceCatalog);
  private readonly translate = inject(TranslateService);
  private readonly ref = inject<MatDialogRef<RegisterReaderDialog, Reader>>(MatDialogRef);

  protected readonly types = DEVICE_TYPES;
  protected readonly spaces = this.catalog.spaces;

  protected readonly id = signal('');
  protected readonly name = signal('');
  protected readonly deviceType = signal<DeviceType | null>(null);
  protected readonly spaceId = signal<string | null>(null);
  protected readonly config = signal<ReaderConfigurationDraft>({
    readerMode: null,
    communicationInterval: 30,
    heartbeatInterval: 60,
    firmwareVersion: '2.4.1',
  });
  protected readonly errors = signal<ReaderError[]>([]);
  protected readonly busy = signal(false);

  protected readonly errorMessages = computed(() => {
    const result: Partial<Record<ReaderError, string>> = {};
    for (const e of this.errors()) result[e] = this.translate.instant(`readers.errors.${e}`);
    return result;
  });

  constructor() {
    if (this.catalog.spaces().length === 0) this.catalog.load().subscribe({ error: () => undefined });
  }

  /** Sugiere el modo según el tipo: los lectores de aula toman asistencia. */
  protected onType(type: DeviceType): void {
    this.deviceType.set(type);
    if (!this.config().readerMode) {
      this.config.update((c) => ({ ...c, readerMode: type === 'CLASSROOM_READER' ? 'ATTENDANCE' : 'ACCESS_CONTROL' }));
    }
  }

  protected async submit(): Promise<void> {
    this.busy.set(true);
    const result = await this.store.register({
      id: this.id(),
      name: this.name(),
      deviceType: this.deviceType(),
      spaceId: this.spaceId(),
      configuration: fromDraft(this.config()),
    });
    this.busy.set(false);
    if (result.ok) this.ref.close(result.value);
    else this.errors.set(result.errors);
  }
}
