import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

type ToastTone = 'info' | 'success' | 'error';

/** Toast abajo a la derecha, 4 s. Los textos pueden ser claves i18n o texto ya traducido. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  info(message: string, params?: Record<string, unknown>): void {
    this.show(message, 'info', params);
  }

  success(message: string, params?: Record<string, unknown>): void {
    this.show(message, 'success', params);
  }

  error(message: string, params?: Record<string, unknown>): void {
    this.show(message, 'error', params);
  }

  /** Error con acción "Reintentar". */
  errorWithRetry(message: string, retry: () => void, params?: Record<string, unknown>): void {
    const ref = this.snackBar.open(this.t(message, params), this.t('common.retry'), this.config('error', 8000));
    ref.onAction().subscribe(() => retry());
  }

  private show(message: string, tone: ToastTone, params?: Record<string, unknown>): void {
    this.snackBar.open(this.t(message, params), this.t('common.close'), this.config(tone, 4000));
  }

  private config(tone: ToastTone, duration: number) {
    return {
      duration,
      horizontalPosition: 'right' as const,
      verticalPosition: 'bottom' as const,
      panelClass: ['tp-toast', `tp-toast--${tone}`],
    };
  }

  private t(key: string, params?: Record<string, unknown>): string {
    const value = this.translate.instant(key, params);
    return typeof value === 'string' ? value : key;
  }
}
