import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
export type BadgeKind =
  | 'credential' | 'reader' | 'session' | 'attendance' | 'decision' | 'user' | 'report'
  | 'enrollment' | 'shift' | 'incident' | 'outcome' | 'role' | 'space';

interface BadgeStyle { tone: BadgeTone; icon: string }

const STYLES: Record<BadgeKind, Record<string, BadgeStyle>> = {
  credential: {
    ACTIVE: { tone: 'success', icon: 'check_circle' },
    BLOCKED: { tone: 'error', icon: 'block' },
    LOST: { tone: 'warning', icon: 'report' },
    DEACTIVATED: { tone: 'neutral', icon: 'do_not_disturb_on' },
  },
  reader: {
    REGISTERED: { tone: 'info', icon: 'app_registration' },
    ACTIVE: { tone: 'success', icon: 'sensors' },
    INACTIVE: { tone: 'neutral', icon: 'pause_circle' },
    OFFLINE: { tone: 'error', icon: 'wifi_off' },
    DEGRADED: { tone: 'warning', icon: 'warning' },
    MAINTENANCE: { tone: 'neutral', icon: 'build' },
  },
  session: {
    SCHEDULED: { tone: 'info', icon: 'schedule' },
    IN_PROGRESS: { tone: 'brand', icon: 'play_circle' },
    FINISHED: { tone: 'neutral', icon: 'task_alt' },
  },
  attendance: {
    PENDING: { tone: 'warning', icon: 'hourglass_top' },
    PRESENT: { tone: 'success', icon: 'check_circle' },
    LATE: { tone: 'warning', icon: 'schedule' },
    ABSENT: { tone: 'error', icon: 'cancel' },
  },
  decision: {
    GRANTED: { tone: 'success', icon: 'check_circle' },
    DENIED: { tone: 'error', icon: 'cancel' },
  },
  user: {
    ACTIVE: { tone: 'success', icon: 'check_circle' },
    INACTIVE: { tone: 'neutral', icon: 'pause_circle' },
    SUSPENDED: { tone: 'error', icon: 'block' },
  },
  report: {
    GENERATING: { tone: 'info', icon: 'progress_activity' },
    GENERATED: { tone: 'success', icon: 'check_circle' },
    ERROR: { tone: 'error', icon: 'error' },
  },
  enrollment: {
    COMPLETED: { tone: 'success', icon: 'check_circle' },
    PENDING: { tone: 'warning', icon: 'hourglass_top' },
  },
  shift: {
    OPEN: { tone: 'info', icon: 'login' },
    CLOSED: { tone: 'neutral', icon: 'logout' },
  },
  incident: {
    OPEN: { tone: 'error', icon: 'error' },
    RESOLVED: { tone: 'success', icon: 'check_circle' },
  },
  outcome: {
    ATTENDANCE: { tone: 'success', icon: 'how_to_reg' },
    ACCESS: { tone: 'info', icon: 'door_open' },
    WORK_SHIFT: { tone: 'brand', icon: 'badge' },
    REJECTED: { tone: 'error', icon: 'cancel' },
  },
  role: {
    ADMIN: { tone: 'brand', icon: 'admin_panel_settings' },
    TEACHER: { tone: 'info', icon: 'school' },
    STUDENT: { tone: 'neutral', icon: 'person' },
    STAFF: { tone: 'neutral', icon: 'engineering' },
  },
  space: {
    AVAILABLE: { tone: 'success', icon: 'check_circle' },
    MAINTENANCE: { tone: 'warning', icon: 'build' },
  },
};

/** Badge de estado: siempre icono + texto. */
@Component({
  selector: 'tp-status-badge',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <span class="badge" [class]="'badge badge--' + style().tone">
      <mat-icon aria-hidden="true">{{ style().icon }}</mat-icon>
      <span>{{ label() ?? ('status.' + kind() + '.' + status()) | translate }}</span>
    </span>
  `,
  styles: `
    .badge { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 10px 0 8px;
      border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1; white-space: nowrap; }
    mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .badge--success { background: var(--tp-success-bg); color: #047857; }
    .badge--warning { background: var(--tp-warning-bg); color: var(--tp-warning-text); }
    .badge--error { background: var(--tp-error-bg); color: #b91c1c; }
    .badge--info { background: var(--tp-info-bg); color: #1d4ed8; }
    .badge--brand { background: var(--tp-brand-light); color: var(--tp-cyan-text); }
    .badge--neutral { background: var(--tp-neutral-bg); color: var(--tp-muted); }
  `,
})
export class StatusBadge {
  readonly kind = input.required<BadgeKind>();
  readonly status = input.required<string>();
  /** Clave i18n alternativa para el texto. */
  readonly label = input<string>();

  protected readonly style = computed<BadgeStyle>(
    () => STYLES[this.kind()][this.status()] ?? { tone: 'neutral', icon: 'radio_button_unchecked' },
  );
}
