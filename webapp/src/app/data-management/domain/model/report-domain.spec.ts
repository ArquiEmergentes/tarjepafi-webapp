import { DataRecord, DataRecordProps } from './data-record.entity';
import { dailyBreakdown, summarizeRecords } from './report-calculator';
import { Report, defaultPeriod } from './report.entity';

let seq = 0;
const fact = (over: Partial<DataRecordProps>): DataRecord =>
  new DataRecord({
    id: `dr-${++seq}`, eventId: `evt-${seq}`, sourceContext: 'IOT_MONITORING', dataType: 'CARD_READING', subjectId: 'RDR-A-301',
    occurredAt: '2026-10-07T10:00:00', recordedAt: '2026-10-07T10:00:00', payload: {}, ...over,
  });

describe('Report', () => {
  it('el periodo es válido si inicio ≤ fin (regla 6.F)', () => {
    expect(Report.isValidPeriod('2026-10-05T00:00:00', '2026-10-11T23:59:59')).toBe(true);
    expect(Report.isValidPeriod('2026-10-12T00:00:00', '2026-10-11T23:59:59')).toBe(false);
  });

  it('sugiere la semana, el mes o el semestre de la fecha actual', () => {
    expect(defaultPeriod('WEEKLY', '2026-10-07')).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(defaultPeriod('MONTHLY', '2026-10-07')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(defaultPeriod('SEMESTER', '2026-10-07')).toEqual({ start: '2026-08-01', end: '2026-12-31' });
  });
});

describe('summarizeRecords', () => {
  const att = (subjectId: string, status: string, recordedAt: string) =>
    fact({ sourceContext: 'ACADEMIC_ATTENDANCE', dataType: 'ATTENDANCE', subjectId, recordedAt, payload: { role: 'STUDENT', status } });

  it('usa el último hecho de cada asistencia e ignora los pendientes', () => {
    const { summary } = summarizeRecords([
      att('att-1', 'PENDING', '2026-10-07T09:50:00'),
      att('att-1', 'PRESENT', '2026-10-07T09:55:00'),
      att('att-2', 'ABSENT', '2026-10-07T11:45:00'),
      att('att-2', 'LATE', '2026-10-07T12:00:00'), // editado por el docente
      att('att-3', 'ABSENT', '2026-10-07T11:45:00'),
      att('att-4', 'PENDING', '2026-10-07T10:00:00'),
    ]);
    expect(summary.attendanceRate).toBe(66.7);
  });

  it('cuenta accesos, hora pico y lectores con incidencias', () => {
    const { totalRecords, summary } = summarizeRecords([
      fact({ occurredAt: '2026-10-07T08:10:00' }),
      fact({ occurredAt: '2026-10-07T10:05:00' }),
      fact({ occurredAt: '2026-10-07T10:40:00' }),
      fact({ dataType: 'ACCESS', payload: { decision: 'GRANTED' } }),
      fact({ dataType: 'ACCESS', payload: { decision: 'DENIED' } }),
      fact({ dataType: 'DEVICE_TELEMETRY', subjectId: 'RDR-T-004', payload: { incidentType: 'DEVICE_OFFLINE' } }),
      fact({ dataType: 'DEVICE_TELEMETRY', subjectId: 'RDR-A-301', payload: { action: 'HEALTH_CHECK' } }),
    ]);
    expect(totalRecords).toBe(7);
    expect(summary).toEqual({ attendanceRate: 0, accessGranted: 1, accessDenied: 1, peakHour: '10:00', readersWithIncidents: 1 });
  });

  it('sin datos devuelve total 0', () => {
    expect(summarizeRecords([]).totalRecords).toBe(0);
    expect(dailyBreakdown([])).toEqual([]);
  });
});
