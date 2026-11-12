import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../shared/application/language.service';
import { AppNotification, NotificationSource } from '../../shared/application/notification.port';
import { ReadersStore } from './readers.store';

/** Avisos de IoT Monitoring: lectores sin conexión e incidencias abiertas. */
@Injectable({ providedIn: 'root' })
export class IotNotifications implements NotificationSource {
  private readonly store = inject(ReadersStore);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);

  readonly roles = ['ADMIN'] as const;

  readonly notifications = computed<AppNotification[]>(() => {
    this.lang.language();
    if (!this.store.loaded()) return [];
    const list: AppNotification[] = [];
    for (const r of this.store.readers().filter((x) => x.status === 'OFFLINE')) {
      list.push({
        id: `iot-offline-${r.id}`,
        icon: 'wifi_off',
        tone: 'error',
        title: this.translate.instant('readers.notifications.offlineTitle', { id: r.id }),
        detail: r.name,
        route: `/admin/readers/${r.id}`,
      });
    }
    const open = this.store.openIncidents().filter((i) => i.type !== 'DEVICE_OFFLINE').length;
    if (open > 0) {
      list.push({
        id: 'iot-incidents',
        icon: 'warning',
        tone: 'warning',
        title: this.translate.instant('readers.notifications.incidentsTitle', { count: open }),
        detail: this.translate.instant('readers.notifications.incidentsDetail'),
        route: '/admin/readers',
      });
    }
    return list;
  });

  refresh(): void {
    void this.store.load();
  }
}
