import { CardTapEvent } from './card-tap-event.entity';
import { Incident } from './incident.entity';

describe('CardTapEvent', () => {
  it('normaliza el UID leído a bytes en mayúsculas separados por ":"', () => {
    expect(CardTapEvent.normalizeUid('04 3d 9b 12 8f')).toBe('04:3D:9B:12:8F');
    expect(CardTapEvent.normalizeUid('043d9b128f')).toBe('04:3D:9B:12:8F');
  });

  it('acepta UIDs de 4 a 7 bytes y rechaza los demás', () => {
    expect(CardTapEvent.isValidUid('04:3D:9B:12')).toBe(true);
    expect(CardTapEvent.isValidUid('04:3D:9B:12:8F:01:02')).toBe(true);
    expect(CardTapEvent.isValidUid('04:3D:9B')).toBe(false);
    expect(CardTapEvent.isValidUid('04:3D:9B:12:8F:01:02:03')).toBe(false);
    expect(CardTapEvent.isValidUid('ZZ:3D:9B:12')).toBe(false);
  });

  it('identifica una lectura rechazada', () => {
    const base = { id: 'evt-1', readerId: 'RDR-A-301', cardUid: '04:FF:12:AB:90', tappedAt: '2026-10-07T09:52:00', displayMessage: '', source: 'SIMULATOR' as const };
    expect(new CardTapEvent({ ...base, outcome: 'REJECTED' }).wasRejected()).toBe(true);
    expect(new CardTapEvent({ ...base, outcome: 'ATTENDANCE' }).wasRejected()).toBe(false);
  });
});

describe('Incident', () => {
  const incident = new Incident({
    id: 'inc-1', readerId: 'RDR-T-004', type: 'DEVICE_OFFLINE', detectedAt: '2026-10-07T09:44:00',
    description: 'Sin heartbeat durante 3 intervalos', resolvedAt: null,
  });

  it('está abierta mientras no se resuelva', () => {
    expect(incident.isOpen()).toBe(true);
  });

  it('al resolverse guarda la fecha y no muta la original', () => {
    const resolved = incident.resolve('2026-10-07T10:05:00');
    expect(resolved.isOpen()).toBe(false);
    expect(resolved.resolvedAt).toBe('2026-10-07T10:05:00');
    expect(incident.isOpen()).toBe(true);
  });
});
