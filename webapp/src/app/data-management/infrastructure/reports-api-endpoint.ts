import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint, BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Report, ReportStatus, ReportSummary, ReportType } from '../domain/model/report.entity';

export interface ReportResource extends BaseResource {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  generatedAt: string | null;
  totalRecords: number;
  summary: ReportSummary | null;
  requestedBy: string;
}

export class ReportAssembler implements BaseAssembler<Report, ReportResource> {
  toEntityFromResource(r: ReportResource): Report {
    return new Report({ ...r, generatedAt: r.generatedAt ?? null, summary: r.summary ?? null, totalRecords: r.totalRecords ?? 0 });
  }

  toResourceFromEntity(e: Report): ReportResource {
    return { ...e.toProps() };
  }
}

@Injectable({ providedIn: 'root' })
export class ReportsApiEndpoint extends BaseApiEndpoint<Report, ReportResource> {
  constructor() {
    super(inject(HttpClient), 'reports', new ReportAssembler());
  }
}
