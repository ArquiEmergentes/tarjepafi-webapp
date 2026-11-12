import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { LocalDateTime, addMinutes, isAfter, minutesBetween, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { SessionSummary, TeacherWorkspace } from '../../../application/teacher-workspace.service';
import { injectTeacherId } from '../../teacher-context';

/** D1 · Mis sesiones de hoy (US25): próxima sesión y clases del día. */
@Component({
  selector: 'tp-my-sessions',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe, EmptyState, PageHeader, Skeleton, StatusBadge],
  templateUrl: './my-sessions.html',
  styleUrl: './my-sessions.scss',
})
export class MySessionsPage {
  private readonly workspace = inject(TeacherWorkspace);
  private readonly spaces = inject(SpaceCatalog);
  private readonly clock = inject(SimulatedClock);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);
  private readonly teacherId = injectTeacherId();

  protected readonly now = this.clock.now;
  /** Día mostrado (por defecto, hoy según la hora simulada). */
  protected readonly day = signal(this.clock.today());
  protected readonly isToday = computed(() => this.day() === this.clock.today());
  protected readonly sessions = signal<SessionSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly spaceById = this.spaces.byId;

  /** Próxima sesión: la que está en curso o la siguiente que aún no termina. */
  protected readonly next = computed(() =>
    this.isToday() ? this.sessions().find((s) => !s.session.isFinished() && isAfter(s.session.closesAt(), this.now())) ?? null : null,
  );

  constructor() {
    effect(() => {
      const day = this.day();
      untracked(() => void this.load(day));
    });
  }

  protected async load(day = this.day()): Promise<void> {
    const teacherId = this.teacherId();
    if (!teacherId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [sessions] = await Promise.all([this.workspace.sessionsOn(teacherId, day), firstValueFrom(this.spaces.load())]);
      this.sessions.set(sessions);
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  protected shiftDay(days: number): void {
    this.day.set(addMinutes(`${this.day()}T00:00:00`, days * 1440).slice(0, 10));
  }

  protected today(): void {
    this.day.set(this.clock.today());
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  /** "Empieza en 10 min", "En curso", "Finalizada". */
  protected timing(s: SessionSummary): { key: string; n?: number } {
    const now = this.now();
    if (s.session.isFinished()) return { key: 'teacher.timing.finished' };
    if (s.session.isUpcoming(now)) return { key: 'teacher.timing.startsIn', n: minutesBetween(now, s.session.scheduledStart) };
    if (isAfter(now, s.session.scheduledEnd)) return { key: 'teacher.timing.closing' };
    return { key: s.session.status === 'IN_PROGRESS' ? 'teacher.timing.inProgress' : 'teacher.timing.open' };
  }

  protected attended(s: SessionSummary): number {
    return s.counts.PRESENT + s.counts.LATE;
  }
}
