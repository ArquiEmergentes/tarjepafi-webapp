import { Reader, ReaderProps } from './reader.entity';
import { validateConfiguration } from './reader-configuration';

const reader = (over: Partial<ReaderProps> = {}): Reader =>
  new Reader({
    id: 'RDR-A-301', name: 'Lector Aula A-301', deviceType: 'CLASSROOM_READER', spaceId: 'sp-a301', status: 'ACTIVE',
    configuration: { readerMode: 'ATTENDANCE', communicationInterval: 30, heartbeatInterval: 60, firmwareVersion: '2.4.1' },
    registeredAt: '2026-08-10T09:00:00', lastSeenAt: '2026-10-07T09:49:30', ...over,
  });

describe('Reader', () => {
  it('valida el formato del ID RDR-X-000', () => {
    expect(Reader.isValidId('RDR-A-304')).toBe(true);
    expect(Reader.isValidId('RDR-AB-304')).toBe(false);
    expect(Reader.isValidId('rdr-a-304')).toBe(false);
  });

  it('solo ACTIVE o DEGRADED procesan lecturas', () => {
    expect(reader().canProcessTaps()).toBe(true);
    expect(reader({ status: 'DEGRADED' }).canProcessTaps()).toBe(true);
    for (const status of ['REGISTERED', 'INACTIVE', 'OFFLINE', 'MAINTENANCE'] as const) {
      expect(reader({ status }).canProcessTaps()).toBe(false);
    }
  });

  it('se activa desde REGISTERED o INACTIVE y se desactiva desde ACTIVE, DEGRADED u OFFLINE', () => {
    expect(reader({ status: 'REGISTERED' }).canBeActivated()).toBe(true);
    expect(reader({ status: 'MAINTENANCE' }).canBeActivated()).toBe(false);
    expect(reader({ status: 'OFFLINE' }).canBeDeactivated()).toBe(true);
    expect(reader({ status: 'INACTIVE' }).canBeDeactivated()).toBe(false);
  });

  it('al activarse registra comunicación en ese instante', () => {
    const activated = reader({ status: 'REGISTERED', lastSeenAt: null }).apply('ACTIVATE', '2026-10-07T10:00:00');
    expect(activated.status).toBe('ACTIVE');
    expect(activated.lastSeenAt).toBe('2026-10-07T10:00:00');
  });

  it('pierde conexión si pasan más de 3 heartbeats sin comunicarse', () => {
    const r = reader({ lastSeenAt: '2026-10-07T09:47:00' }); // heartbeat 60 s → tolerancia 180 s
    expect(r.hasLostConnection('2026-10-07T09:50:00')).toBe(false);
    expect(r.hasLostConnection('2026-10-07T09:50:01')).toBe(true);
    expect(reader({ status: 'INACTIVE', lastSeenAt: '2026-10-01T00:00:00' }).hasLostConnection('2026-10-07T09:50:00')).toBe(false);
  });

  it('un heartbeat devuelve a ACTIVE a un lector OFFLINE', () => {
    const r = reader({ status: 'OFFLINE' }).heartbeat('2026-10-07T10:00:00');
    expect(r.status).toBe('ACTIVE');
    expect(r.lastSeenAt).toBe('2026-10-07T10:00:00');
  });
});

describe('validateConfiguration', () => {
  const ok = { readerMode: 'ACCESS_CONTROL' as const, communicationInterval: 30, heartbeatInterval: 60, firmwareVersion: '2.4.1' };

  it('acepta una configuración válida', () => {
    expect(validateConfiguration(ok)).toEqual([]);
  });

  it('exige intervalos > 0, heartbeat ≥ comunicación y firmware x.y.z', () => {
    expect(validateConfiguration({ ...ok, communicationInterval: 0 })).toContain('COMMUNICATION_INTERVAL_INVALID');
    expect(validateConfiguration({ ...ok, heartbeatInterval: 20 })).toContain('HEARTBEAT_LOWER_THAN_COMMUNICATION');
    expect(validateConfiguration({ ...ok, firmwareVersion: '2.4' })).toContain('FIRMWARE_FORMAT');
  });
});
