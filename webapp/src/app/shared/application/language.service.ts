import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'es' | 'en';
const STORAGE_KEY = 'tp.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<AppLanguage>('es');

  readonly language = this.current.asReadonly();
  readonly available: readonly AppLanguage[] = ['es', 'en'];

  init(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // sin almacenamiento: ES por defecto
    }
    this.use(saved === 'en' ? 'en' : 'es');
  }

  use(lang: AppLanguage): void {
    this.current.set(lang);
    this.translate.use(lang);
    this.document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // preferencia solo en memoria
    }
  }

  /** Locale para DatePipe / DecimalPipe. */
  locale(): string {
    return this.current() === 'es' ? 'es-PE' : 'en-US';
  }
}
