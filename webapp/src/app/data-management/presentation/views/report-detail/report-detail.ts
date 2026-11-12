import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { ColumnChart, ColumnPoint } from '../../../../shared/presentation/components/column-chart/column-chart';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { ReportDetail, ReportsStore } from '../../../application/reports.store';
import { downloadCsv, reportToCsv } from '../../report-csv';

/** A7 · Detalle del reporte: resumen, desglose por día y exportación CSV. */
@Component({
  selector: 'tp-report-detail',
  imports: [DatePipe, LowerCasePipe, RouterLink, MatButtonModule, MatIconModule, TranslatePipe, ColumnChart, EmptyState, KpiCard, PageHeader, Skeleton, StatusBadge],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss',
})
export class ReportDetailPage {
  /** Parámetro de ruta `:reportId`. */
  readonly reportId = input.required<string>();

  private readonly store = inject(ReportsStore);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly detail = signal<ReportDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly dayColumns = computed<ColumnPoint[]>(() => {
    this.lang.language();
    return (this.detail()?.days ?? []).map((d) => ({
      label: d.date.slice(8, 10) + '/' + d.date.slice(5, 7),
      value: d.readings,
      tooltip: this.translate.instant('reports.dayTooltip', { date: d.date, count: d.readings }),
    }));
  });

  constructor() {
    effect(() => {
      const id = this.reportId();
      untracked(() => void this.load(id));
    });
  }

  protected async load(id = this.reportId()): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.detail.set(await this.store.detail(id));
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  protected export(): void {
    const d = this.detail();
    if (!d) return;
    downloadCsv(`tarjepafi-${d.report.reportType.toLowerCase()}-${d.report.periodStart.slice(0, 10)}.csv`, reportToCsv(d.report, d.days));
    this.toast.success('reports.exported');
  }
}
