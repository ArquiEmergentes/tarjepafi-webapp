import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../shared/presentation/services/dialog.service';
import { ToastService } from '../../shared/presentation/services/toast.service';
import { ReadersStore } from '../application/readers.store';
import { Reader, ReaderAction } from '../domain/model/reader.entity';
import { RegisterReaderDialog } from './components/register-reader-dialog/register-reader-dialog';

const ICONS: Record<ReaderAction, string> = {
  ACTIVATE: 'play_circle',
  DEACTIVATE: 'power_settings_new',
  START_MAINTENANCE: 'build',
  END_MAINTENANCE: 'task_alt',
};

/** Orquesta confirmación → caso de uso → toast para las acciones sobre lectores. */
@Injectable({ providedIn: 'root' })
export class ReaderActions {
  private readonly store = inject(ReadersStore);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);

  icon(action: ReaderAction): string {
    return ICONS[action];
  }

  async run(reader: Reader, action: ReaderAction): Promise<boolean> {
    const confirmed = await firstValueFrom(
      this.dialogs.confirm({
        title: `readers.actions.${action}.title`,
        message: `readers.actions.${action}.message`,
        params: { id: reader.id, name: reader.name },
        confirmLabel: `readers.actions.${action}.confirm`,
        destructive: action === 'DEACTIVATE',
        icon: ICONS[action],
      }),
    );
    if (!confirmed) return false;
    const result = await this.store.changeStatus(reader.id, action);
    if (result.ok) {
      this.toast.success(`readers.actions.${action}.done`, { id: reader.id });
      return true;
    }
    this.toast.error(`readers.errors.${result.errors[0]}`);
    return false;
  }

  async healthCheck(reader: Reader): Promise<boolean> {
    const result = await this.store.healthCheck(reader.id);
    if (!result.ok) {
      this.toast.error(`readers.errors.${result.errors[0]}`);
      return false;
    }
    const { sample, reconnected } = result.value;
    this.toast.success(reconnected ? 'readers.healthCheck.reconnected' : 'readers.healthCheck.ok', {
      id: reader.id,
      signal: sample.signalStrength,
    });
    return true;
  }

  async register(): Promise<Reader | undefined> {
    const reader = await firstValueFrom(
      this.dialogs.open<RegisterReaderDialog, null, Reader>(RegisterReaderDialog, null, { width: '640px' }),
    );
    if (reader) this.toast.success('readers.register.done', { id: reader.id });
    return reader;
  }
}
