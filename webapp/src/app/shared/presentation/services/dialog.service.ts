import { Injectable, Type, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData, ConfirmDialogResult } from '../components/confirm-dialog/confirm-dialog';

/** Abre modales con el backdrop del Design System (#0F172A al 50 %). */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<ConfirmDialogResult | undefined> {
    return this.open<ConfirmDialog, ConfirmDialogData, ConfirmDialogResult>(ConfirmDialog, data, { width: '480px' });
  }

  open<TComponent, TData, TResult>(
    component: Type<TComponent>,
    data: TData,
    config: MatDialogConfig<TData> = {},
  ): Observable<TResult | undefined> {
    return this.dialog
      .open<TComponent, TData, TResult>(component, {
        maxWidth: 'calc(100vw - 32px)',
        backdropClass: ['cdk-overlay-dark-backdrop', 'tp-backdrop'],
        autoFocus: 'first-tabbable',
        ...config,
        data,
      })
      .afterClosed();
  }
}
