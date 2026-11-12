import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { CampusSettings } from '../../../../shared/domain/campus-settings';
import { LocalDateTime, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { DialogService } from '../../../../shared/presentation/services/dialog.service';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { CredentialRow, CredentialsStore } from '../../../application/credentials.store';
import { EnrollmentVerificationService, EnrollmentVerificationSummary } from '../../../application/enrollment-verification.service';

/** A3 · Verificar matrículas (US15): ejecuta la desactivación automática y muestra un resumen. */
@Component({
  selector: 'tp-enrollment-check',
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe,
    EmptyState, KpiCard, PageHeader, Skeleton, StatusBadge,
  ],
  templateUrl: './enrollment-check.html',
  styleUrl: './enrollment-check.scss',
})
export class EnrollmentCheckPage implements OnInit {
  private readonly store = inject(CredentialsStore);
  private readonly verification = inject(EnrollmentVerificationService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly clock = inject(SimulatedClock);
  protected readonly lang = inject(LanguageService);

  protected readonly settings = signal<CampusSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly running = signal(false);
  protected readonly summary = signal<EnrollmentVerificationSummary | null>(null);

  protected readonly now = this.clock.now;
  /** Vista previa en vivo: cambia con la hora simulada y con los datos del store. */
  protected readonly plan = computed(() => {
    const s = this.settings();
    return s && this.store.loaded() ? this.verification.preview(s) : null;
  });
  protected readonly candidates = computed<CredentialRow[]>(() =>
    (this.plan()?.toDeactivate ?? []).map((c) => this.store.row(c.id)).filter((r): r is CredentialRow => !!r),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [settings] = await Promise.all([this.verification.settings(), this.store.load()]);
      if (this.store.loadError()) throw new Error('load');
      this.settings.set(settings);
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

  protected async run(): Promise<void> {
    const plan = this.plan();
    const confirmed = await firstValueFrom(
      this.dialogs.confirm({
        title: 'enrollmentCheck.confirmTitle',
        message: plan?.deadlinePassed ? 'enrollmentCheck.confirmMessage' : 'enrollmentCheck.confirmMessageInTime',
        params: { count: plan?.toDeactivate.length ?? 0 },
        confirmLabel: 'enrollmentCheck.run',
        icon: 'fact_check',
      }),
    );
    if (!confirmed) return;

    this.running.set(true);
    try {
      const summary = await this.verification.run();
      this.summary.set(summary);
      this.toast.success('enrollmentCheck.summary', { deactivated: summary.deactivated.length, unchanged: summary.unchangedCount });
      if (summary.failedCount > 0) this.toast.error('enrollmentCheck.partialError', { count: summary.failedCount });
    } catch {
      this.toast.errorWithRetry('common.saveError', () => void this.run());
    } finally {
      this.running.set(false);
    }
  }
}
