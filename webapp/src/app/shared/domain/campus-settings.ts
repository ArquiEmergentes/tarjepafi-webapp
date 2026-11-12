import { LocalDateTime } from './date-time';

/** Parámetros de la sede para el ciclo vigente (colección `settings`). */
export interface CampusSettings {
  term: string;
  enrollmentDeadline: LocalDateTime;
  defaultToleranceMinutes: number;
}
