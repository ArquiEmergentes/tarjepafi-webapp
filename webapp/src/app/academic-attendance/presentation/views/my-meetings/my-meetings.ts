import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { MeetingRow, TeacherWorkspace } from '../../../application/teacher-workspace.service';
import { injectTeacherId } from '../../teacher-context';

/** D4 · Mis reuniones (US21): reuniones y capacitaciones con su asistencia. */
@Component({
  selector: 'tp-my-meetings',
  imports: [DatePipe, MatButtonModule, MatIconModule, TranslatePipe, EmptyState, PageHeader, Skeleton, StatusBadge],
  template: `
    <section class="tp-page">
      <tp-page-header [title]="'teacher.meetings.title' | translate" [subtitle]="'teacher.meetings.subtitle' | translate" />

      @if (loading()) {
        <tp-skeleton variant="table" [count]="3" />
      } @else if (failed()) {
        <div class="tp-card">
          <tp-empty-state icon="cloud_off" tone="error" [title]="'common.loadErrorTitle' | translate" [message]="'common.loadError' | translate">
            <button mat-flat-button type="button" (click)="load()"><mat-icon>refresh</mat-icon>{{ 'common.retry' | translate }}</button>
          </tp-empty-state>
        </div>
      } @else if (rows().length === 0) {
        <div class="tp-card">
          <tp-empty-state icon="groups" [title]="'teacher.meetings.emptyTitle' | translate" [message]="'teacher.meetings.emptyMessage' | translate" />
        </div>
      } @else {
        <div class="list">
          @for (m of rows(); track m.session.id) {
            <article class="tp-card meeting">
              <div class="when">
                <span class="day">{{ date(m.session.scheduledStart) | date: 'd' : 'UTC' }}</span>
                <span class="month">{{ date(m.session.scheduledStart) | date: 'MMM' : 'UTC' : lang.locale() }}</span>
              </div>
              <div class="info">
                <h3>{{ m.session.title }}</h3>
                <p class="tp-muted">
                  <mat-icon>schedule</mat-icon>{{ m.session.timeRange() }}
                  <mat-icon>meeting_room</mat-icon>{{ spaceById().get(m.session.spaceId)?.name ?? m.session.spaceId }}
                </p>
              </div>
              <div class="status">
                @if (m.record; as r) {
                  <tp-status-badge kind="attendance" [status]="r.status" />
                  @if (r.checkInAt) {
                    <small>{{ 'teacher.meetings.markedAt' | translate }} {{ date(r.checkInAt) | date: 'HH:mm:ss' : 'UTC' }}</small>
                  }
                } @else if (isUpcoming(m)) {
                  <tp-status-badge kind="session" status="SCHEDULED" label="teacher.meetings.upcoming" />
                } @else {
                  <span class="tp-muted">{{ 'teacher.session.unmarked' | translate }}</span>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 16px; }
    .meeting { display: flex; align-items: center; gap: 24px; }
    .when { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 12px;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); flex: none; }
    .day { font-family: var(--tp-font-title); font-size: 22px; font-weight: 600; line-height: 1; }
    .month { font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .info { flex: 1; min-width: 0; }
    .info p { display: flex; align-items: center; gap: 4px; margin: 4px 0 0; font-size: 13px; flex-wrap: wrap; }
    .info mat-icon { font-size: 16px; width: 16px; height: 16px; margin-left: 8px; }
    .info mat-icon:first-child { margin-left: 0; }
    .status { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .status small { font-size: 12px; color: var(--tp-muted); }
  `,
})
export class MyMeetingsPage implements OnInit {
  private readonly workspace = inject(TeacherWorkspace);
  private readonly spaces = inject(SpaceCatalog);
  private readonly clock = inject(SimulatedClock);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);
  private readonly teacherId = injectTeacherId();

  protected readonly rows = signal<MeetingRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly spaceById = this.spaces.byId;

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const teacherId = this.teacherId();
    if (!teacherId) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [rows] = await Promise.all([this.workspace.myMeetings(teacherId), firstValueFrom(this.spaces.load())]);
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

  protected isUpcoming(m: MeetingRow): boolean {
    return !m.session.isFinished();
  }
}
