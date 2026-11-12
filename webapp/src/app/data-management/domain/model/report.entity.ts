import { LocalDateTime, addMinutes, dayOfWeek, isAfter } from '../../../shared/domain/date-time';

export type ReportType = 'WEEKLY' | 'MONTHLY' | 'SEMESTER';
export type ReportStatus = 'GENERATING' | 'GENERATED' | 'ERROR';

export const REPORT_TYPES: readonly ReportType[] = ['WEEKLY', 'MONTHLY', 'SEMESTER'];

export interface ReportSummary {
  /** % de asistencia de estudiantes (presente o tarde sobre asistencias resueltas). */
  attendanceRate: number;
  accessGranted: number;
  accessDenied: number;
  /** "HH:00" con más lecturas, o null sin lecturas. */
  peakHour: string | null;
  readersWithIncidents: number;
}

export interface ReportProps {
  id: string;
  reportType: ReportType;
  periodStart: LocalDateTime;
  periodEnd: LocalDateTime;
  status: ReportStatus;
  generatedAt: LocalDateTime | null;
  totalRecords: number;
  summary: ReportSummary | null;
  requestedBy: string;
}

export class Report {
  readonly id: string;
  readonly reportType: ReportType;
  readonly periodStart: LocalDateTime;
  readonly periodEnd: LocalDateTime;
  readonly status: ReportStatus;
  readonly generatedAt: LocalDateTime | null;
  readonly totalRecords: number;
  readonly summary: ReportSummary | null;
  readonly requestedBy: string;

  constructor(props: ReportProps) {
    this.id = props.id;
    this.reportType = props.reportType;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this.status = props.status;
    this.generatedAt = props.generatedAt;
    this.totalRecords = props.totalRecords;
    this.summary = props.summary;
    this.requestedBy = props.requestedBy;
  }

  /** Regla 6.F: inicio ≤ fin. */
  static isValidPeriod(start: LocalDateTime, end: LocalDateTime): boolean {
    return !!start && !!end && !Number.isNaN(Date.parse(`${start}Z`)) && !Number.isNaN(Date.parse(`${end}Z`)) && !isAfter(start, end);
  }

  isGenerating(): boolean {
    return this.status === 'GENERATING';
  }

  isGenerated(): boolean {
    return this.status === 'GENERATED';
  }

  hasData(): boolean {
    return this.isGenerated() && this.totalRecords > 0;
  }

  complete(summary: ReportSummary, totalRecords: number, at: LocalDateTime): Report {
    return new Report({ ...this.toProps(), status: 'GENERATED', summary, totalRecords, generatedAt: at });
  }

  fail(at: LocalDateTime): Report {
    return new Report({ ...this.toProps(), status: 'ERROR', generatedAt: at });
  }

  toProps(): ReportProps {
    return { ...this, summary: this.summary ? { ...this.summary } : null };
  }
}

/** Periodo sugerido según el tipo, a partir de la fecha actual (o simulada). Fechas "YYYY-MM-DD". */
export function defaultPeriod(type: ReportType, today: string): { start: string; end: string } {
  const [year, month] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (type === 'WEEKLY') {
    const monday = addMinutes(`${today}T00:00:00`, -(dayOfWeek(`${today}T00:00:00`) - 1) * 1440).slice(0, 10);
    return { start: monday, end: addMinutes(`${monday}T00:00:00`, 6 * 1440).slice(0, 10) };
  }
  if (type === 'MONTHLY') {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
  }
  // Semestre académico: ciclo 1 de marzo a julio, ciclo 2 de agosto a diciembre.
  return month >= 8 ? { start: `${year}-08-01`, end: `${year}-12-31` } : { start: `${year}-03-01`, end: `${year}-07-31` };
}
