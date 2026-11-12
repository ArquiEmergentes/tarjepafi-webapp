import { CardHolder, CardHolderProps } from './card-holder.entity';
import { Credential, CredentialProps } from './credential.entity';
import { CredentialPermission, resolveAccess } from './credential-permission.entity';
import { planEnrollmentVerification } from './enrollment-verification';

const card = (over: Partial<CredentialProps> = {}): Credential =>
  new Credential({
    id: 'cred-1', cardUid: '04:A2:7F:91:3C', cardHolderId: 'ch-1', status: 'ACTIVE',
    issuedAt: '2026-08-17T09:00:00', statusChangedAt: '2026-08-17T09:00:00', lastUsedAt: null, ...over,
  });

const holder = (over: Partial<CardHolderProps> = {}): CardHolder =>
  new CardHolder({
    id: 'ch-1', code: 'U202312966', fullName: 'Javier Gonzales', email: 'u202312966@upc.edu.pe',
    role: 'STUDENT', program: 'Ingeniería de Software', enrollmentStatus: 'COMPLETED', ...over,
  });

describe('Credential', () => {
  it('solo una tarjeta ACTIVE puede bloquearse o reportarse perdida', () => {
    expect(card().availableActions()).toEqual(['BLOCK', 'REPORT_LOST', 'DEACTIVATE']);
    expect(card({ status: 'BLOCKED' }).canBeBlocked()).toBe(false);
    expect(card({ status: 'LOST' }).canBeReportedLost()).toBe(false);
  });

  it('se da de baja desde ACTIVE, BLOCKED o LOST, pero no desde DEACTIVATED', () => {
    expect(card({ status: 'LOST' }).canBeDeactivated()).toBe(true);
    expect(card({ status: 'DEACTIVATED' }).canBeDeactivated()).toBe(false);
  });

  it('se reactiva desde BLOCKED, LOST o DEACTIVATED y registra la fecha del cambio', () => {
    const reactivated = card({ status: 'DEACTIVATED' }).apply('REACTIVATE', '2026-10-07T10:00:00');
    expect(reactivated.status).toBe('ACTIVE');
    expect(reactivated.statusChangedAt).toBe('2026-10-07T10:00:00');
    expect(card().canBeReactivated()).toBe(false);
  });

  it('rechaza transiciones no permitidas', () => {
    expect(() => card({ status: 'DEACTIVATED' }).apply('BLOCK', '2026-10-07T10:00:00')).toThrow();
  });
});

describe('resolveAccess (US14)', () => {
  const perm = (effect: 'ALLOW' | 'DENY') => new CredentialPermission({ id: 'p', credentialId: 'cred-1', spaceId: 'sp', effect });

  it('la excepción de la tarjeta tiene prioridad sobre los roles del espacio', () => {
    expect(resolveAccess(perm('ALLOW'), ['STAFF'], 'STUDENT')).toEqual({ allowed: true, basis: 'EXCEPTION' });
    expect(resolveAccess(perm('DENY'), ['STAFF'], 'STAFF')).toEqual({ allowed: false, basis: 'EXCEPTION' });
  });

  it('sin excepción se usan los roles permitidos', () => {
    expect(resolveAccess(undefined, ['TEACHER', 'STAFF'], 'TEACHER')).toEqual({ allowed: true, basis: 'ROLE' });
    expect(resolveAccess(undefined, ['TEACHER', 'STAFF'], 'STUDENT').allowed).toBe(false);
    expect(resolveAccess(undefined, ['STUDENT'], null).allowed).toBe(false);
  });
});

describe('planEnrollmentVerification (US15)', () => {
  const holders = new Map([
    ['ch-1', holder()],
    ['ch-2', holder({ id: 'ch-2', enrollmentStatus: 'PENDING' })],
    ['ch-3', holder({ id: 'ch-3', role: 'TEACHER', enrollmentStatus: null })],
  ]);
  const cards = [
    card({ id: 'c1', cardHolderId: 'ch-1' }),
    card({ id: 'c2', cardHolderId: 'ch-2' }),
    card({ id: 'c3', cardHolderId: 'ch-3' }),
    card({ id: 'c4', cardHolderId: 'ch-2', status: 'BLOCKED' }),
    card({ id: 'c5', cardHolderId: null }),
  ];

  it('después del plazo desactiva solo tarjetas ACTIVE de estudiantes con matrícula pendiente', () => {
    const plan = planEnrollmentVerification(cards, holders, '2026-10-07T09:50:00', '2026-10-03T23:59:59');
    expect(plan.deadlinePassed).toBe(true);
    expect(plan.toDeactivate.map((c) => c.id)).toEqual(['c2']);
    expect(plan.unchanged.map((c) => c.id)).toEqual(['c1']);
  });

  it('dentro del plazo no desactiva nada', () => {
    const plan = planEnrollmentVerification(cards, holders, '2026-10-02T09:00:00', '2026-10-03T23:59:59');
    expect(plan.deadlinePassed).toBe(false);
    expect(plan.toDeactivate).toEqual([]);
  });
});
