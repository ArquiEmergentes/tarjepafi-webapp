import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { READER_STATUSES } from '../../../../iot-monitoring/domain/model/reader.entity';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { BarItem, BarList } from '../../../../shared/presentation/components/bar-list/bar-list';
import { ColumnChart, ColumnPoint } from '../../../../shared/presentation/components/column-chart/column-chart';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge, badgeStyle } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { DashboardQuery, DashboardSnapshot } from '../../../application/dashboard.query';

const CREDENTIAL_STATUSES = ['ACTIVE', 'BLOCKED', 'LOST', 'DEACTIVATED'] as const;

/** A1 · Dashboard: indicadores del día calculados en vivo desde las colecciones. */
@Component({
  selector: 'tp-dashboard',
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, TranslatePipe,
    BarList, ColumnChart, EmptyState, KpiCard, PageHeader, Skeleton, StatusBadge,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  private readonly query = inject(DashboardQuery);
  private readonly spaces = inject(SpaceCatalog);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly data = signal<DashboardSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly refreshing = signal(false);

  protected readonly accessTotal = computed(() => {
    const a = this.data()?.access;
    return a ? a.granted + a.denied : 0;
  });
  protected readonly online = computed(() => {
    const r = this.data()?.readers.byStatus;
    return r ? r.ACTIVE + r.DEGRADED : 0;
  });

  protected readonly sessionBars = computed<BarItem[]>(() => {
    this.lang.language();
    return (this.data()?.attendance.sessions ?? []).map((s) => ({
      id: s.sessionId,
      label: `${s.timeRange} · ${s.title}`,
      value: s.attended,
      tone: 'brand',
      caption: `/ ${s.enrolled}${s.pending ? ' · ' + this.translate.instant('dashboard.pendingShort', { count: s.pending }) : ''}`,
    }));
  });
  protected readonly maxEnrolled = computed(() => Math.max(1, ...(this.data()?.attendance.sessions ?? []).map((s) => s.enrolled)));

  protected readonly readerBars = computed<BarItem[]>(() => {
    this.lang.language();
    const d = this.data();
    if (!d) return [];
    return READER_STATUSES.map((status) => ({
      id: status,
      label: this.translate.instant(`status.reader.${status}`),
      value: d.readers.byStatus[status],
      ...badgeStyle('reader', status),
    }));
  });

  protected readonly credentialBars = computed<BarItem[]>(() => {
    this.lang.language();
    const d = this.data();
    if (!d) return [];
    return CREDENTIAL_STATUSES.map((status) => ({
      id: status,
      label: this.translate.instant(`status.credential.${status}`),
      value: d.credentials.byStatus[status],
      caption: `${d.credentials.total ? Math.round((d.credentials.byStatus[status] / d.credentials.total) * 100) : 0} %`,
      ...badgeStyle('credential', status),
    }));
  });

  protected readonly hourColumns = computed<ColumnPoint[]>(() => {
    this.lang.language();
    return (this.data()?.tapsByHour ?? []).map((h) => ({
      label: `${h.hour}h`,
      value: h.count,
      tooltip: this.translate.instant('dashboard.hourTooltip', { hour: h.hour, count: h.count }),
    }));
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.data()) this.refreshing.set(true);
    else this.loading.set(true);
    this.failed.set(false);
    try {
      this.data.set(await this.query.snapshot());
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
      this.refreshing.set(false);
    }
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  protected spaceName(readerSpace: string | undefined): string {
    return readerSpace ? (this.spaces.byId().get(readerSpace)?.name ?? readerSpace) : '';
  }
}
