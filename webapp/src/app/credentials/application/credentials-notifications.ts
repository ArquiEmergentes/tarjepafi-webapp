import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../shared/application/language.service';
import { AppNotification, NotificationSource } from '../../shared/application/notification.port';
import { CampusSettings } from '../../shared/domain/campus-settings';
import { CredentialsStore } from './credentials.store';
import { EnrollmentVerificationService } from './enrollment-verification.service';

/** Avisos de Credentials para la campana del administrador. */
@Injectable({ providedIn: 'root' })
export class CredentialsNotifications implements NotificationSource {
  private readonly store = inject(CredentialsStore);
  private readonly verification = inject(EnrollmentVerificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);
  private readonly settings = signal<CampusSettings | null>(null);

  readonly roles = ['ADMIN'] as const;

  readonly notifications = computed<AppNotification[]>(() => {
    this.lang.language(); // re-traduce al cambiar de idioma
    const settings = this.settings();
    if (!settings || !this.store.loaded()) return [];
    const list: AppNotification[] = [];

    const pending = this.verification.preview(settings);
    if (pending.deadlinePassed && pending.toDeactivate.length > 0) {
      list.push({
        id: 'credentials-enrollment',
        icon: 'assignment_late',
        tone: 'warning',
        title: this.translate.instant('credentials.notifications.enrollmentTitle', { count: pending.toDeactivate.length }),
        detail: this.translate.instant('credentials.notifications.enrollmentDetail'),
        route: '/admin/enrollment-check',
      });
    }
    const blocked = this.store.countByStatus().BLOCKED;
    if (blocked > 0) {
      list.push({
        id: 'credentials-blocked',
        icon: 'block',
        tone: 'info',
        title: this.translate.instant('credentials.notifications.blockedTitle', { count: blocked }),
        detail: this.translate.instant('credentials.notifications.blockedDetail'),
        route: '/admin/credentials',
      });
    }
    return list;
  });

  refresh(): void {
    void this.store.load();
    this.verification.settings().then(
      (s) => this.settings.set(s),
      () => this.settings.set(null),
    );
  }
}
