import { DailyBreakdown } from '../domain/model/report-calculator';
import { Report } from '../domain/model/report.entity';

const escape = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV del reporte: desglose por día y una fila TOTAL con el resumen. */
export function reportToCsv(report: Report, days: DailyBreakdown[]): string {
  const s = report.summary;
  const header = ['fecha', 'lecturas', 'asistencia_pct', 'accesos_concedidos', 'accesos_denegados', 'hora_pico', 'lectores_con_incidencias'];
  const rows = days.map((d) => [d.date, d.readings, d.attendanceRate ?? '', d.accessGranted, d.accessDenied, '', '']);
  rows.push([
    'TOTAL',
    days.reduce((n, d) => n + d.readings, 0),
    s?.attendanceRate ?? '',
    s?.accessGranted ?? 0,
    s?.accessDenied ?? 0,
    s?.peakHour ?? '',
    s?.readersWithIncidents ?? 0,
  ]);
  const meta = [
    ['reporte', report.id],
    ['tipo', report.reportType],
    ['periodo', `${report.periodStart.slice(0, 10)} a ${report.periodEnd.slice(0, 10)}`],
    ['registros', report.totalRecords],
    [],
  ];
  // BOM para que Excel abra los acentos correctamente.
  return '﻿' + [...meta, header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
