import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { FieldError } from '../../../../shared/presentation/components/field-error/field-error';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { ReportsStore } from '../../../application/reports.store';
import { REPORT_TYPES, Report, ReportType, defaultPeriod } from '../../../domain/model/report.entity';
import { downloadCsv, reportToCsv } from '../../report-csv';

/** A7 · Reportes: generar (semanal, mensual o semestral), listar y exportar. */
@Component({
  selector: 'tp-report-list',
  imports: [
    DatePipe, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatTooltipModule, TranslatePipe, EmptyState, FieldError, PageHeader, Skeleton, StatusBadge,
  ],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
})
export class ReportListPage implements OnInit {
  private readonly store = inject(ReportsStore);
  private readonly clock = inject(SimulatedClock);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly types = REPORT_TYPES;
  protected readonly reports = this.store.reports;
  protected readonly loading = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly failed = computed(() => this.store.loadError() && !this.store.loaded());

  protected readonly type = signal<ReportType>('WEEKLY');
  protected readonly start = signal('');
  protected readonly end = signal('');
  protected readonly periodError = signal(false);
  protected readonly busy = signal(false);
  protected readonly exportingId = signal<string | null>(null);

  ngOnInit(): void {
    this.applyDefaults('WEEKLY');
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await this.store.load();
    if (this.store.loadError()) this.toast.errorWithRetry('common.loadError', () => void this.reload());
  }

  protected onType(type: ReportType): void {
    this.type.set(type);
    this.applyDefaults(type);
  }

  private applyDefaults(type: ReportType): void {
    const { start, end } = defaultPeriod(type, this.clock.today());
    this.start.set(start);
    this.end.set(end);
    this.periodError.set(false);
  }

  protected async generate(): Promise<void> {
    this.busy.set(true);
    const result = await this.store.generate(this.type(), this.start(), this.end());
    this.busy.set(false);
    if (result.ok) {
      this.periodError.set(false);
      this.toast.info('reports.generating');
    } else if (result.error === 'INVALID_PERIOD') {
      this.periodError.set(true);
    } else {
      this.toast.error('common.saveError');
    }
  }

  protected async export(report: Report): Promise<void> {
    this.exportingId.set(report.id);
    try {
      const detail = await this.store.detail(report.id);
      if (detail) downloadCsv(`tarjepafi-${report.reportType.toLowerCase()}-${report.periodStart.slice(0, 10)}.csv`, reportToCsv(detail.report, detail.days));
    } catch {
      this.toast.error('reports.exportError');
    } finally {
      this.exportingId.set(null);
    }
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }
}
