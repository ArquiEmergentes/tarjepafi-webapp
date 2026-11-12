import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LocalDateTime, addMinutes, datePart, toMs } from '../domain/date-time';

const STORAGE_KEY = 'tp.simulatedTime';

/**
 * Reloj simulado de la demo. Todas las reglas que dependen de la hora (ventanas de asistencia,
 * cierre de sesiones, lectores sin comunicación, verificación de matrículas) leen la hora desde aquí.
 */
@Injectable({ providedIn: 'root' })
export class SimulatedClock {
  private readonly current = signal<LocalDateTime>(this.restore());

  readonly now = this.current.asReadonly();
  readonly today = computed(() => datePart(this.current()));

  set(value: LocalDateTime): void {
    if (Number.isNaN(toMs(value))) return;
    this.current.set(value.slice(0, 19).padEnd(19, ':00'));
    this.persist();
  }

  advance(minutes: number): void {
    this.set(addMinutes(this.current(), minutes));
  }

  reset(): void {
    this.set(environment.initialSimulatedTime);
  }

  private restore(): LocalDateTime {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !Number.isNaN(toMs(saved))) return saved;
    } catch {
      // almacenamiento no disponible: se usa la hora inicial
    }
    return environment.initialSimulatedTime;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.current());
    } catch {
      // sin persistencia: la hora vive solo en memoria
    }
  }
}
