import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../shared/presentation/services/dialog.service';
import { ToastService } from '../../shared/presentation/services/toast.service';
import { CredentialRow, CredentialsStore } from '../application/credentials.store';
import { CardHolder } from '../domain/model/card-holder.entity';
import { CredentialAction } from '../domain/model/credential.entity';
import {
  CredentialActionDialog,
  CredentialActionDialogData,
  CredentialActionDialogResult,
} from './components/credential-action-dialog/credential-action-dialog';
import { LinkHolderDialog, LinkHolderDialogData } from './components/link-holder-dialog/link-holder-dialog';

/** Orquesta diálogo → caso de uso → toast para las acciones sobre una tarjeta (lista y detalle). */
@Injectable({ providedIn: 'root' })
export class CredentialActions {
  private readonly store = inject(CredentialsStore);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);

  /** Devuelve true si la acción se aplicó. */
  async run(row: CredentialRow, action: CredentialAction): Promise<boolean> {
    const input = await firstValueFrom(
      this.dialogs.open<CredentialActionDialog, CredentialActionDialogData, CredentialActionDialogResult>(
        CredentialActionDialog,
        {
          action,
          cardUid: row.credential.cardUid,
          holderName: row.holder?.fullName ?? null,
          isStudent: row.holder?.isStudent() ?? false,
        },
        { width: '520px' },
      ),
    );
    if (!input) return false;

    const result = await this.store.changeStatus(row.credential.id, action, input);
    if (result.ok) {
      this.toast.success(`credentials.actions.${action}.done`, { uid: row.credential.cardUid });
      return true;
    }
    this.toast.error(`credentials.errors.${result.error}`, result.params);
    return false;
  }

  async link(row: CredentialRow): Promise<boolean> {
    const holder = await firstValueFrom(
      this.dialogs.open<LinkHolderDialog, LinkHolderDialogData, CardHolder>(
        LinkHolderDialog,
        { credentialId: row.credential.id, cardUid: row.credential.cardUid, currentHolder: row.holder },
        { width: '560px' },
      ),
    );
    if (!holder) return false;
    this.toast.success('credentials.link.done', { uid: row.credential.cardUid, holder: holder.fullName });
    return true;
  }
}
