import { AccessRecord, AccessRecordProps } from './access-record.entity';
import { Space, SpaceProps } from './space.entity';
import { WorkShift } from './work-shift.entity';

const space = (over: Partial<SpaceProps> = {}): Space =>
  new Space({
    id: 'sp-d003', code: 'D-003', name: 'Sala de Servidores', type: 'RESTRICTED_AREA', building: 'D', floor: 0,
    capacity: 4, status: 'AVAILABLE', accessPolicy: 'RESTRICTED', allowedRoles: ['STAFF'], ...over,
  });

const accessRecord = (over: Partial<AccessRecordProps> = {}): AccessRecord =>
  new AccessRecord({
    id: 'acc-1', tapEventId: 'evt-1', cardUid: '04:3D:9B:12:8F', credentialId: 'cred-001', cardHolderId: 'ch-001',
    spaceId: 'sp-d003', readerId: 'RDR-D-003', accessType: 'SPACE_ACCESS', decision: 'DENIED',
    denialReason: 'UNAUTHORIZED_ROLE', attemptedAt: '2026-10-07T09:52:00', ...over,
  });

describe('Space (US12)', () => {
  it('solo permite los roles configurados en el espacio', () => {
    expect(space().allowsRole('STAFF')).toBe(true);
    expect(space().allowsRole('STUDENT')).toBe(false);
  });

  it('identifica un espacio en mantenimiento', () => {
    expect(space().isInMaintenance()).toBe(false);
    expect(space({ status: 'MAINTENANCE' }).isInMaintenance()).toBe(true);
  });

  it('toProps devuelve una copia de los roles permitidos', () => {
    const s = space();
    const props = s.toProps();
    props.allowedRoles.push('STUDENT');
    expect(s.allowsRole('STUDENT')).toBe(false);
  });
});

describe('AccessRecord (US12)', () => {
  it('distingue un acceso concedido de uno denegado', () => {
    expect(accessRecord().isGranted()).toBe(false);
    expect(accessRecord({ decision: 'GRANTED', denialReason: 'NONE' }).isGranted()).toBe(true);
  });
});

describe('WorkShift (US24)', () => {
  it('abre la jornada con la fecha de la entrada', () => {
    const shift = WorkShift.open('ws-1', 'ch-T0001', '2026-10-07T07:02:00');
    expect(shift.isOpen()).toBe(true);
    expect(shift.date).toBe('2026-10-07');
    expect(shift.exitAt).toBeNull();
  });

  it('al cerrarse calcula los minutos trabajados sin mutar la jornada original', () => {
    const open = WorkShift.open('ws-1', 'ch-T0001', '2026-10-07T07:00:00');
    const closed = open.close('2026-10-07T15:30:00');
    expect(closed.isOpen()).toBe(false);
    expect(closed.workedMinutes).toBe(510);
    expect(closed.exitAt).toBe('2026-10-07T15:30:00');
    expect(open.isOpen()).toBe(true);
  });
});
