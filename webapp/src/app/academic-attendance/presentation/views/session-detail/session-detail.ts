import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { LocalDateTime, formatDuration, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { DialogService } from '../../../../shared/presentation/services/dialog.service';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { RosterRow, SessionDetail, TeacherWorkspace } from '../../../application/teacher-workspace.service';
import {
  EditAttendanceDialog,
  EditAttendanceDialogData,
  EditAttendanceDialogResult,
} from '../../components/edit-attendance-dialog/edit-attendance-dialog';
import { injectTeacherId } from '../../teacher-context';

/** D2 · Sesión de clase (US16): lista de asistencia y edición con motivo. */
@Component({
  selector: 'tp-session-detail',
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe,
    EmptyState, KpiCard, PageHeader, Skeleton, StatusBadge,
  ],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.scss',
})
export class SessionDetailPage {
  /** Parámetro de ruta `:sessionId`. */
  readonly sessionId = input.required<string>();

  private readonly workspace = inject(TeacherWorkspace);
  private readonly spaces = inject(SpaceCatalog);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);
  private readonly teacherId = injectTeacherId();

  protected readonly detail = signal<SessionDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly spaceById = this.spaces.byId;

  protected readonly editable = computed(() => this.detail()?.session.status !== 'SCHEDULED');
  protected readonly hasRecords = computed(() => (this.detail()?.roster ?? []).some((r) => r.record !== null));
  protected readonly attendanceRate = computed(() => {
    const c = this.detail()?.counts;
    if (!c || c.total === 0) return 0;
    return Math.round(((c.PRESENT + c.LATE) / c.total) * 100);
  });

  constructor() {
    effect(() => {
      const id = this.sessionId();
      untracked(() => void this.load(id));
    });
  }

  protected async load(id = this.sessionId()): Promise<void> {
    const teacherId = this.teacherId();
    if (!teacherId) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [detail] = await Promise.all([this.workspace.sessionDetail(teacherId, id), firstValueFrom(this.spaces.load())]);
      this.detail.set(detail);
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

  protected duration(minutes: number | null): string {
    return minutes === null ? '—' : formatDuration(minutes);
  }

  protected async edit(row: RosterRow): Promise<void> {
    const teacherId = this.teacherId();
    const detail = this.detail();
    if (!teacherId || !detail) return;
    const input = await firstValueFrom(
      this.dialogs.open<EditAttendanceDialog, EditAttendanceDialogData, EditAttendanceDialogResult>(
        EditAttendanceDialog,
        { studentName: row.fullName, studentCode: row.code, current: row.record?.status ?? null },
        { width: '520px' },
      ),
    );
    if (!input) return;
    this.busy.set(true);
    const result = await this.workspace.editAttendance(teacherId, detail.session.id, row.cardHolderId, input.status, input.reason);
    this.busy.set(false);
    if (result.ok) {
      this.toast.success('teacher.edit.done', { name: row.fullName });
      await this.load();
    } else {
      this.toast.error(`teacher.errors.${result.error}`);
    }
  }

  protected async confirmPending(): Promise<void> {
    const teacherId = this.teacherId();
    const detail = this.detail();
    if (!teacherId || !detail) return;
    const confirmed = await firstValueFrom(
      this.dialogs.confirm({
        title: 'teacher.session.confirmPendingTitle',
        message: 'teacher.session.confirmPendingMessage',
        params: { count: detail.counts.PENDING },
        confirmLabel: 'teacher.session.confirmPending',
        icon: 'task_alt',
      }),
    );
    if (!confirmed) return;
    this.busy.set(true);
    const result = await this.workspace.confirmPending(teacherId, detail.session.id);
    this.busy.set(false);
    if (result.ok) {
      this.toast.success('teacher.session.pendingConfirmed', { count: result.value });
      await this.load();
    } else {
      this.toast.error(`teacher.errors.${result.error}`);
    }
  }
}
