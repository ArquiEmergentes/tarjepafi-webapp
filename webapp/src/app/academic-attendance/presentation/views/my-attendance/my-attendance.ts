import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { LocalDateTime, formatDuration, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { TeacherWorkspace } from '../../../application/teacher-workspace.service';
import { Course } from '../../../domain/model/academic-catalog.entities';
import { AttendanceRecord } from '../../../domain/model/attendance-record.entity';
import { Session } from '../../../domain/model/session.entity';
import { injectTeacherId } from '../../teacher-context';

interface Row {
  record: AttendanceRecord;
  session: Session;
  course: Course | undefined;
}

/** D3 · Mi asistencia docente (US17, US20, US22, US23): llegada, salida y duración de cada clase. */
@Component({
  selector: 'tp-my-attendance',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, TranslatePipe, EmptyState, KpiCard, PageHeader, Skeleton, StatusBadge],
  template: `
    <section class="tp-page">
      <tp-page-header [title]="'teacher.myAttendance.title' | translate" [subtitle]="'teacher.myAttendance.subtitle' | translate" />

      @if (loading()) {
        <tp-skeleton variant="cards" [count]="3" />
        <tp-skeleton variant="table" [count]="5" />
      } @else if (failed()) {
        <div class="tp-card">
          <tp-empty-state icon="cloud_off" tone="error" [title]="'common.loadErrorTitle' | translate" [message]="'common.loadError' | translate">
            <button mat-flat-button type="button" (click)="load()"><mat-icon>refresh</mat-icon>{{ 'common.retry' | translate }}</button>
          </tp-empty-state>
        </div>
      } @else {
        <div class="kpis">
          <tp-kpi-card [label]="'teacher.myAttendance.classes' | translate" [value]="rows().length" icon="event_available" tone="brand" />
          <tp-kpi-card [label]="'teacher.myAttendance.punctuality' | translate" [value]="punctuality()" suffix="%" icon="schedule" tone="success"
            [caption]="'teacher.myAttendance.punctualityCaption' | translate" />
          <tp-kpi-card [label]="'teacher.myAttendance.taught' | translate" [value]="taught()" icon="timer" tone="brand"
            [caption]="'teacher.myAttendance.taughtCaption' | translate" />
        </div>

        <article class="tp-card table-card">
          <header class="table-head"><h3>{{ 'teacher.myAttendance.history' | translate }}</h3></header>
          @if (rows().length === 0) {
            <tp-empty-state icon="history" [title]="'teacher.myAttendance.emptyTitle' | translate" [message]="'teacher.myAttendance.emptyMessage' | translate" />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>{{ 'teacher.myAttendance.date' | translate }}</th>
                    <th>{{ 'teacher.sessions.course' | translate }}</th>
                    <th>{{ 'teacher.sessions.room' | translate }}</th>
                    <th>{{ 'teacher.myAttendance.arrival' | translate }}</th>
                    <th>{{ 'teacher.myAttendance.exit' | translate }}</th>
                    <th>{{ 'teacher.session.duration' | translate }}</th>
                    <th>{{ 'teacher.sessions.status' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of rows(); track r.record.id) {
                    <tr>
                      <td class="nowrap cap">{{ date(r.session.scheduledStart) | date: 'EEE d MMM y' : 'UTC' : lang.locale() }}</td>
                      <td>
                        <a class="stack" [routerLink]="['/teacher/sessions', r.session.id]">
                          <strong>{{ r.course?.name ?? r.session.title }}</strong><small>{{ r.course?.subject }} · {{ r.session.timeRange() }}</small>
                        </a>
                      </td>
                      <td>{{ spaceById().get(r.session.spaceId)?.name ?? r.session.spaceId }}</td>
                      <td class="nowrap mono">{{ r.record.checkInAt ? (date(r.record.checkInAt) | date: 'HH:mm:ss' : 'UTC') : '—' }}</td>
                      <td class="nowrap mono">
                        @if (r.record.checkOutAt) {
                          {{ date(r.record.checkOutAt) | date: 'HH:mm:ss' : 'UTC' }}
                        } @else {
                          <span class="tp-muted">{{ (r.session.isFinished() ? 'teacher.myAttendance.noExit' : 'teacher.myAttendance.inClass') | translate }}</span>
                        }
                      </td>
                      <td class="nowrap">{{ r.record.durationMinutes !== null ? duration(r.record.durationMinutes) : '—' }}</td>
                      <td><tp-status-badge kind="attendance" [status]="r.record.status" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </article>
      }
    </section>
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
    .table-card { padding: 0; overflow: hidden; }
    .table-head { padding: 24px 24px 16px; }
    .stack { display: flex; flex-direction: column; line-height: 1.3; font-weight: 400; color: var(--tp-text); }
    .stack strong { color: var(--tp-cyan-text); }
    .stack small { color: var(--tp-muted); font-size: 12px; }
    .nowrap { white-space: nowrap; }
    .cap::first-letter { text-transform: uppercase; }
    .mono { font-variant-numeric: tabular-nums; font-weight: 500; }
  `,
})
export class MyAttendancePage implements OnInit {
  private readonly workspace = inject(TeacherWorkspace);
  private readonly spaces = inject(SpaceCatalog);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);
  private readonly teacherId = injectTeacherId();

  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly spaceById = this.spaces.byId;

  protected readonly punctuality = computed(() => {
    const list = this.rows().filter((r) => r.record.attended());
    return list.length ? Math.round((list.filter((r) => r.record.status === 'PRESENT').length / list.length) * 100) : 0;
  });
  protected readonly taught = computed(() => formatDuration(this.rows().reduce((sum, r) => sum + (r.record.durationMinutes ?? 0), 0)));

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const teacherId = this.teacherId();
    if (!teacherId) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [rows] = await Promise.all([this.workspace.myClassAttendance(teacherId), firstValueFrom(this.spaces.load())]);
      this.rows.set(rows);
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  protected duration(minutes: number): string {
    return formatDuration(minutes);
  }
}
