import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SESSION_PORT } from '../../shared/application/session.port';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { LocalDateTime } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { DataRecord } from '../domain/model/data-record.entity';
import { DailyBreakdown, dailyBreakdown, summarizeRecords } from '../domain/model/report-calculator';
import { Report, ReportType } from '../domain/model/report.entity';
import { DataRecordsApiEndpoint } from '../infrastructure/data-records-api-endpoint';
import { ReportsApiEndpoint } from '../infrastructure/reports-api-endpoint';

/** Tiempo simulado de generación (el reporte pasa por GENERATING antes de quedar listo). */
export const GENERATION_DELAY_MS = 2500;

export type ReportError = 'INVALID_PERIOD' | 'SAVE_FAILED';
export type ReportResult<T> = { ok: true; value: T } | { ok: false; error: ReportError };

export interface ReportDetail {
  report: Report;
  days: DailyBreakdown[];
}

/** Casos de uso de reportes (regla 6.F). */
@Injectable({ providedIn: 'root' })
export class ReportsStore {
  private readonly reportsApi = inject(ReportsApiEndpoint);
  private readonly recordsApi = inject(DataRecordsApiEndpoint);
  private readonly clock = inject(SimulatedClock);
  private readonly session = inject(SESSION_PORT);

  private readonly list = signal<Report[]>([]);
  readonly reports = this.list.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const reports = await firstValueFrom(this.reportsApi.getAll());
      this.list.set(this.sort(reports));
      this.loaded.set(true);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  report(id: string): Report | undefined {
    return this.list().find((r) => r.id === id);
  }

  /** Crea el reporte en GENERATING y, tras unos segundos, calcula el resumen desde `dataRecords`. */
  async generate(type: ReportType, startDate: string, endDate: string): Promise<ReportResult<Report>> {
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;
    if (!startDate || !endDate || !Report.isValidPeriod(start, end)) return { ok: false, error: 'INVALID_PERIOD' };

    try {
      const created = await firstValueFrom(
        this.reportsApi.create(
          new Report({
            id: newId('rep'),
            reportType: type,
            periodStart: start,
            periodEnd: end,
            status: 'GENERATING',
            generatedAt: null,
            totalRecords: 0,
            summary: null,
            requestedBy: this.session.user()?.id ?? 'UNKNOWN',
          }),
        ),
      );
      this.list.update((list) => this.sort([created, ...list]));
      setTimeout(() => void this.complete(created), GENERATION_DELAY_MS);
      return { ok: true, value: created };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  async detail(id: string): Promise<ReportDetail | null> {
    let report = this.report(id);
    if (!report) {
      try {
        report = await firstValueFrom(this.reportsApi.getById(id));
      } catch {
        return null;
      }
    }
    const days = report.isGenerated() ? dailyBreakdown(await this.recordsIn(report.periodStart, report.periodEnd)) : [];
    return { report, days };
  }

  // ---------- Internos ----------

  private async complete(report: Report): Promise<void> {
    const now = this.clock.now();
    let result: Report;
    try {
      const records = await this.recordsIn(report.periodStart, report.periodEnd);
      const { totalRecords, summary } = summarizeRecords(records);
      result = report.complete(summary, totalRecords, now);
    } catch {
      result = report.fail(now);
    }
    try {
      const saved = await firstValueFrom(this.reportsApi.update(result));
      this.list.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
    } catch {
      this.list.update((list) => list.map((r) => (r.id === report.id ? report.fail(now) : r)));
    }
  }

  private recordsIn(start: LocalDateTime, end: LocalDateTime): Promise<DataRecord[]> {
    return firstValueFrom(this.recordsApi.getAll({ occurredAt_gte: start, occurredAt_lte: end }));
  }

  private sort(reports: Report[]): Report[] {
    // Los que se están generando primero; luego por fecha de generación, del más reciente al más antiguo.
    return [...reports].sort((a, b) => {
      if (a.isGenerating() !== b.isGenerating()) return a.isGenerating() ? -1 : 1;
      return (b.generatedAt ?? '').localeCompare(a.generatedAt ?? '') || b.id.localeCompare(a.id);
    });
  }
}
