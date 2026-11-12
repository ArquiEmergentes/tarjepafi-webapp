/**
 * Fechas del dominio: hora local del campus (Lima) en ISO 8601 sin zona, "YYYY-MM-DDTHH:mm:ss".
 * Se operan como si fueran UTC para que el resultado no dependa de la zona horaria del navegador.
 */
export type LocalDateTime = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export function toMs(value: LocalDateTime): number {
  return Date.parse(value.length === 10 ? `${value}T00:00:00Z` : `${value.slice(0, 19)}Z`);
}

export function fromMs(ms: number): LocalDateTime {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function addMinutes(value: LocalDateTime, minutes: number): LocalDateTime {
  return fromMs(toMs(value) + minutes * 60_000);
}

export function minutesBetween(from: LocalDateTime, to: LocalDateTime): number {
  return Math.round((toMs(to) - toMs(from)) / 60_000);
}

export function isBefore(a: LocalDateTime, b: LocalDateTime): boolean {
  return toMs(a) < toMs(b);
}

export function isAfter(a: LocalDateTime, b: LocalDateTime): boolean {
  return toMs(a) > toMs(b);
}

/** "2026-10-07" */
export function datePart(value: LocalDateTime): string {
  return value.slice(0, 10);
}

/** "09:50" */
export function timePart(value: LocalDateTime): string {
  return value.slice(11, 16);
}

/** 1 = lunes … 7 = domingo */
export function dayOfWeek(value: LocalDateTime): number {
  const day = new Date(toMs(value)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Combina una fecha "YYYY-MM-DD" con una hora "HH:mm". */
export function combine(date: string, time: string): LocalDateTime {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

/** "1 h 28 min", "45 min", "8 h 05 min" */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h} h ${pad(m)} min`;
}

export type ElapsedUnit = 'now' | 'seconds' | 'minutes' | 'hours' | 'days';

/** Tiempo transcurrido entre dos fechas para mostrar "hace 8 s", "hace 6 min"… */
export function elapsedSince(now: LocalDateTime, then: LocalDateTime): { unit: ElapsedUnit; value: number } {
  const seconds = Math.max(0, Math.round((toMs(now) - toMs(then)) / 1000));
  if (seconds < 5) return { unit: 'now', value: 0 };
  if (seconds < 60) return { unit: 'seconds', value: seconds };
  if (seconds < 3600) return { unit: 'minutes', value: Math.floor(seconds / 60) };
  if (seconds < 86400) return { unit: 'hours', value: Math.floor(seconds / 3600) };
  return { unit: 'days', value: Math.floor(seconds / 86400) };
}

/** Convierte una fecha local a Date para usar DatePipe con timeZone 'UTC'. */
export function toDisplayDate(value: LocalDateTime | null | undefined): Date | null {
  return value ? new Date(toMs(value)) : null;
}
