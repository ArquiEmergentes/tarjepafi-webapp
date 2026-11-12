import { datePart } from '../../../shared/domain/date-time';
import { DataRecord } from './data-record.entity';
import { ReportSummary } from './report.entity';

export interface DailyBreakdown {
  date: string;
  readings: number;
  attendanceRate: number | null;
  accessGranted: number;
  accessDenied: number;
}

const ATTENDED = new Set(['PRESENT', 'LATE']);
const RESOLVED = new Set(['PRESENT', 'LATE', 'ABSENT']);

/**
 * Las asistencias se registran como hechos inmutables: un mismo registro puede tener varios hechos
 * (PENDING → PRESENT → editado). Para medir se toma el último hecho de cada registro.
 */
function latestAttendance(records: readonly DataRecord[]): DataRecord[] {
  const latest = new Map<string, DataRecord>();
  for (const r of records) {
    if (r.dataType !== 'ATTENDANCE' || r.payload['role'] !== 'STUDENT') continue;
    const prev = latest.get(r.subjectId);
    if (!prev || r.recordedAt >= prev.recordedAt) latest.set(r.subjectId, r);
  }
  return [...latest.values()];
}

function attendanceRate(records: readonly DataRecord[]): number | null {
  const resolved = latestAttendance(records).filter((r) => RESOLVED.has(String(r.payload['status'])));
  if (resolved.length === 0) return null;
  const attended = resolved.filter((r) => ATTENDED.has(String(r.payload['status']))).length;
  return Math.round((attended / resolved.length) * 1000) / 10;
}

function accessCounts(records: readonly DataRecord[]): { granted: number; denied: number } {
  const access = records.filter((r) => r.dataType === 'ACCESS');
  const granted = access.filter((r) => r.payload['decision'] === 'GRANTED').length;
  return { granted, denied: access.length - granted };
}

/** Regla 6.F: resumen del reporte calculado desde `dataRecords`. */
export function summarizeRecords(records: readonly DataRecord[]): { totalRecords: number; summary: ReportSummary } {
  const byHour = new Map<string, number>();
  for (const r of records.filter((x) => x.dataType === 'CARD_READING')) {
    const hour = r.occurredAt.slice(11, 13);
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }
  const peak = [...byHour.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const incidentReaders = new Set(
    records.filter((r) => r.dataType === 'DEVICE_TELEMETRY' && r.payload['incidentType']).map((r) => r.subjectId),
  );
  const { granted, denied } = accessCounts(records);
  return {
    totalRecords: records.length,
    summary: {
      attendanceRate: attendanceRate(records) ?? 0,
      accessGranted: granted,
      accessDenied: denied,
      peakHour: peak ? `${peak[0]}:00` : null,
      readersWithIncidents: incidentReaders.size,
    },
  };
}

/** Desglose por día para el detalle del reporte y la exportación CSV. */
export function dailyBreakdown(records: readonly DataRecord[]): DailyBreakdown[] {
  const byDay = new Map<string, DataRecord[]>();
  for (const r of records) {
    const day = datePart(r.occurredAt);
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, list]) => {
      const { granted, denied } = accessCounts(list);
      return {
        date,
        readings: list.filter((r) => r.dataType === 'CARD_READING').length,
        attendanceRate: attendanceRate(list),
        accessGranted: granted,
        accessDenied: denied,
      };
    });
}
