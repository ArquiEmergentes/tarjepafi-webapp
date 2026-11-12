import { addMinutes, combine, dayOfWeek, formatDuration, minutesBetween } from './date-time';

describe('date-time', () => {
  it('suma minutos cruzando la hora', () => {
    expect(addMinutes('2026-10-07T09:50:00', 15)).toBe('2026-10-07T10:05:00');
  });

  it('calcula minutos entre dos fechas', () => {
    expect(minutesBetween('2026-10-07T10:01:00', '2026-10-07T11:29:00')).toBe(88);
  });

  it('formatea duraciones como en la pantalla del lector', () => {
    expect(formatDuration(88)).toBe('1 h 28 min');
    expect(formatDuration(485)).toBe('8 h 05 min');
    expect(formatDuration(45)).toBe('45 min');
  });

  it('obtiene el día de la semana (1 = lunes)', () => {
    expect(dayOfWeek('2026-10-05T08:00:00')).toBe(1);
    expect(dayOfWeek('2026-10-10T08:00:00')).toBe(6);
  });

  it('combina fecha y hora', () => {
    expect(combine('2026-10-07', '10:00')).toBe('2026-10-07T10:00:00');
  });
});
