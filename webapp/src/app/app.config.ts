import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatIconRegistry } from '@angular/material/icon';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import localeEsPE from '@angular/common/locales/es-PE';

import { routes } from './app.routes';
import { AuthStore } from './iam/application/auth.store';
import { CredentialsNotifications } from './credentials/application/credentials-notifications';
import { LanguageService } from './shared/application/language.service';
import { NOTIFICATION_SOURCES } from './shared/application/notification.port';
import { SESSION_PORT } from './shared/application/session.port';

registerLocaleData(localeEsPE, 'es-PE');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
      fallbackLang: 'es',
      lang: 'es',
    }),
    { provide: SESSION_PORT, useExisting: AuthStore },
    { provide: NOTIFICATION_SOURCES, useExisting: CredentialsNotifications, multi: true },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', floatLabel: 'always', subscriptSizing: 'dynamic' },
    },
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
      inject(LanguageService).init();
      inject(AuthStore).restore();
    }),
  ],
};
