import { AttendanceRecord, AttendanceRecordProps } from './attendance-record.entity';
import { Session, SessionProps } from './session.entity';

const session = (over: Partial<SessionProps> = {}): Session =>
  new Session({
    id: 'ses-02-7', type: 'CLASS', scheduleId: 'sch-02', title: 'Aplicaciones Web · SW51', spaceId: 'sp-a301', date: '2026-10-07',
    scheduledStart: '2026-10-07T10:00:00', scheduledEnd: '2026-10-07T11:30:00', toleranceMinutes: 10, status: 'SCHEDULED', ...over,
  });

const record = (over: Partial<AttendanceRecordProps> = {}): AttendanceRecord =>
  new AttendanceRecord({
    id: 'att-1', tapEventId: 'evt-1', sessionId: 'ses-02-7', cardHolderId: 'ch-1', role: 'STUDENT', checkInAt: '2026-10-07T09:55:00',
    checkOutAt: null, durationMinutes: null, status: 'PENDING', confirmedAt: null, source: 'NFC', modifiedBy: null, modifiedAt: null,
    editReason: null, ...over,
  });

describe('Session', () => {
  it('está en curso desde 15 min antes del inicio hasta el fin', () => {
    const s = session();
    expect(s.isInProgress('2026-10-07T09:44:59')).toBe(false);
    expect(s.isInProgress('2026-10-07T09:45:00')).toBe(true);
    expect(s.isInProgress('2026-10-07T11:30:00')).toBe(true);
    expect(s.isInProgress('2026-10-07T11:30:01')).toBe(false);
    expect(session({ status: 'FINISHED' }).isInProgress('2026-10-07T10:00:00')).toBe(false);
  });

  it('se cierra automáticamente 15 min después del fin', () => {
    expect(session().shouldAutoClose('2026-10-07T11:45:00')).toBe(false);
    expect(session().shouldAutoClose('2026-10-07T11:45:01')).toBe(true);
    expect(session({ status: 'FINISHED' }).shouldAutoClose('2026-10-07T12:00:00')).toBe(false);
  });

  it('muestra el horario como 10:00–11:30', () => {
    expect(session().timeRange()).toBe('10:00–11:30');
  });
});

describe('AttendanceRecord', () => {
  it('PRESENT si marca hasta inicio + tolerancia; si no, LATE', () => {
    expect(AttendanceRecord.resolveStatus('2026-10-07T10:10:00', '2026-10-07T10:10:00')).toBe('PRESENT');
    expect(AttendanceRecord.resolveStatus('2026-10-07T10:10:01', '2026-10-07T10:10:00')).toBe('LATE');
  });

  it('un PENDING se confirma según su propia hora de marcación', () => {
    const late = record({ checkInAt: '2026-10-07T10:14:00' }).confirm('2026-10-07T10:20:00', '2026-10-07T10:10:00');
    expect(late.status).toBe('LATE');
    expect(late.confirmedAt).toBe('2026-10-07T10:20:00');
    const onTime = record().confirm('2026-10-07T10:20:00', '2026-10-07T10:10:00');
    expect(onTime.status).toBe('PRESENT');
  });

  it('la salida del docente calcula la duración', () => {
    const out = record({ role: 'TEACHER', checkInAt: '2026-10-07T10:01:00', status: 'PRESENT' }).checkOut('2026-10-07T11:29:00');
    expect(out.durationMinutes).toBe(88);
  });

  it('la edición del docente guarda origen, autor, fecha y motivo', () => {
    const edited = record({ status: 'ABSENT' }).edit('PRESENT', '  Justificación médica  ', 'usr-002', '2026-10-07T12:00:00');
    expect(edited.status).toBe('PRESENT');
    expect(edited.wasEditedByTeacher()).toBe(true);
    expect(edited.modifiedBy).toBe('usr-002');
    expect(edited.editReason).toBe('Justificación médica');
  });
});
