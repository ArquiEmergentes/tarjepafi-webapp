import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { CampusSettings } from '../../shared/domain/campus-settings';
import { LocalDateTime } from '../../shared/domain/date-time';
import { CampusSettingsApi } from '../../shared/infrastructure/campus-settings-api';
import { SYSTEM_ACTOR } from '../domain/model/credential-status-change.entity';
import { EnrollmentVerificationPlan, planEnrollmentVerification } from '../domain/model/enrollment-verification';
import { CredentialRow, CredentialsStore } from './credentials.store';

export interface EnrollmentVerificationSummary {
  executedAt: LocalDateTime;
  deadline: LocalDateTime;
  deadlinePassed: boolean;
  deactivated: CredentialRow[];
  unchangedCount: number;
  failedCount: number;
}

/** Caso de uso US15: desactivación automática de tarjetas por matrícula no completada. */
@Injectable({ providedIn: 'root' })
export class EnrollmentVerificationService {
  private readonly store = inject(CredentialsStore);
  private readonly settingsApi = inject(CampusSettingsApi);
  private readonly clock = inject(SimulatedClock);

  settings(): Promise<CampusSettings> {
    return firstValueFrom(this.settingsApi.get());
  }

  /** Vista previa con los datos actuales (no modifica nada). */
  preview(settings: CampusSettings): EnrollmentVerificationPlan {
    return planEnrollmentVerification(
      this.store.rows().map((r) => r.credential),
      this.store.holdersById(),
      this.clock.now(),
      settings.enrollmentDeadline,
    );
  }

  async run(): Promise<EnrollmentVerificationSummary> {
    const settings = await this.settings();
    await this.store.load(); // datos frescos antes de decidir
    if (this.store.loadError()) throw new Error('No se pudieron cargar las credenciales');

    const executedAt = this.clock.now();
    const plan = this.preview(settings);
    const deactivated: CredentialRow[] = [];
    let failedCount = 0;
    for (const credential of plan.toDeactivate) {
      const result = await this.store.changeStatus(credential.id, 'DEACTIVATE', {
        reason: 'ENROLLMENT_NOT_COMPLETED',
        actor: SYSTEM_ACTOR,
      });
      const row = this.store.row(credential.id);
      if (result.ok && row) deactivated.push(row);
      else failedCount++;
    }
    return {
      executedAt,
      deadline: settings.enrollmentDeadline,
      deadlinePassed: plan.deadlinePassed,
      deactivated,
      unchangedCount: plan.unchanged.length,
      failedCount,
    };
  }
}
