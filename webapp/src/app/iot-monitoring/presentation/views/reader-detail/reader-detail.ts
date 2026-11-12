import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { LocalDateTime, elapsedSince, formatDuration, timePart, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { LineChart, LinePoint } from '../../../../shared/presentation/components/line-chart/line-chart';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { ReaderError, ReadersStore } from '../../../application/readers.store';
import { Incident } from '../../../domain/model/incident.entity';
import { MISSED_HEARTBEATS_FOR_OFFLINE, ReaderAction } from '../../../domain/model/reader.entity';
import { TelemetrySample, WEAK_SIGNAL_DBM } from '../../../domain/model/telemetry-sample.entity';
import {
  ReaderConfigurationDraft,
  ReaderConfigurationFields,
  fromDraft,
  toDraft,
} from '../../components/reader-configuration-fields/reader-configuration-fields';
import { ReaderActions } from '../../reader-actions.service';

/** A4 · Detalle de lector: resumen, configuración editable, telemetría e incidencias. */
@Component({
  selector: 'tp-reader-detail',
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule, TranslatePipe,
    EmptyState, LineChart, PageHeader, Skeleton, StatusBadge, ReaderConfigurationFields,
  ],
  templateUrl: './reader-detail.html',
  styleUrl: './reader-detail.scss',
})
export class ReaderDetailPage {
  /** Parámetro de ruta `:readerId`. */
  readonly readerId = input.required<string>();

  private readonly store = inject(ReadersStore);
  private readonly catalog = inject(SpaceCatalog);
  private readonly actions = inject(ReaderActions);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly clock = inject(SimulatedClock);
  protected readonly lang = inject(LanguageService);

  protected readonly weakSignal = WEAK_SIGNAL_DBM;
  protected readonly missedHeartbeats = MISSED_HEARTBEATS_FOR_OFFLINE;

  protected readonly reader = computed(() => this.store.reader(this.readerId()));
  protected readonly space = computed(() => {
    const r = this.reader();
    return r ? this.catalog.byId().get(r.spaceId) : undefined;
  });
  protected readonly incidents = computed(() => this.store.incidentsOf(this.readerId()));
  protected readonly openIncidents = computed(() => this.incidents().filter((i) => i.isOpen()));
  protected readonly loading = computed(() => !this.store.loaded() && !this.store.loadError());
  protected readonly failed = computed(() => this.store.loadError() && !this.store.loaded());

  protected readonly telemetry = signal<TelemetrySample[]>([]);
  protected readonly telemetryLoading = signal(true);
  protected readonly telemetryFailed = signal(false);
  protected readonly latest = computed(() => this.telemetry().at(-1));
  protected readonly chartPoints = computed<LinePoint[]>(() =>
    this.telemetry().slice(-24).map((t) => ({ label: timePart(t.capturedAt), value: t.signalStrength })),
  );
  protected readonly newestFirst = computed(() => [...this.telemetry()].reverse());

  protected readonly draft = signal<ReaderConfigurationDraft>({ readerMode: null, communicationInterval: null, heartbeatInterval: null, firmwareVersion: '' });
  protected readonly configErrors = signal<ReaderError[]>([]);
  protected readonly configMessages = computed(() => {
    this.lang.language();
    const result: Partial<Record<ReaderError, string>> = {};
    for (const e of this.configErrors()) result[e] = this.translate.instant(`readers.errors.${e}`);
    return result;
  });
  protected readonly configDirty = computed(() => {
    const r = this.reader();
    return !!r && JSON.stringify(fromDraft(this.draft())) !== JSON.stringify(r.configuration);
  });
  protected readonly busy = signal(false);

  constructor() {
    void this.reload();
    effect(() => {
      void this.loadTelemetry(this.readerId());
    });
    // La configuración editable parte siempre de la guardada.
    effect(() => {
      const r = this.reader();
      if (r) untracked(() => this.draft.set(toDraft(r.configuration)));
    });
    effect(() => {
      this.clock.now();
      if (untracked(() => this.store.loaded())) void this.store.evaluateConnectivity();
    });
  }

  protected async reload(): Promise<void> {
    if (this.catalog.spaces().length === 0) this.catalog.load().subscribe({ error: () => undefined });
    await this.store.ensureLoaded();
    if (this.store.loadError() && !this.store.loaded()) this.toast.errorWithRetry('common.loadError', () => void this.store.load());
  }

  protected async loadTelemetry(id: string): Promise<void> {
    this.telemetryLoading.set(true);
    this.telemetryFailed.set(false);
    try {
      this.telemetry.set(await firstValueFrom(this.store.telemetry(id)));
    } catch {
      this.telemetryFailed.set(true);
    } finally {
      this.telemetryLoading.set(false);
    }
  }

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  protected elapsed(value: LocalDateTime | null) {
    return value ? elapsedSince(this.clock.now(), value) : null;
  }

  protected uptime(seconds: number): string {
    return formatDuration(seconds / 60);
  }

  protected icon(action: ReaderAction): string {
    return this.actions.icon(action);
  }

  protected async run(action: ReaderAction): Promise<void> {
    const r = this.reader();
    if (!r) return;
    this.busy.set(true);
    await this.actions.run(r, action);
    this.busy.set(false);
  }

  protected async healthCheck(): Promise<void> {
    const r = this.reader();
    if (!r) return;
    this.busy.set(true);
    if (await this.actions.healthCheck(r)) await this.loadTelemetry(r.id);
    this.busy.set(false);
  }

  protected async saveConfiguration(): Promise<void> {
    const r = this.reader();
    if (!r) return;
    this.busy.set(true);
    const result = await this.store.updateConfiguration(r.id, fromDraft(this.draft()));
    this.busy.set(false);
    if (result.ok) {
      this.configErrors.set([]);
      this.toast.success('readers.config.saved', { id: r.id });
    } else {
      this.configErrors.set(result.errors);
      this.toast.error(result.errors.includes('SAVE_FAILED') ? 'readers.errors.SAVE_FAILED' : 'readers.config.invalid');
    }
  }

  protected resetConfiguration(): void {
    const r = this.reader();
    if (r) this.draft.set(toDraft(r.configuration));
    this.configErrors.set([]);
  }

  protected async resolve(incident: Incident): Promise<void> {
    this.busy.set(true);
    const result = await this.store.resolveIncident(incident);
    this.busy.set(false);
    if (result.ok) this.toast.success('readers.incidents.resolved');
    else this.toast.error(`readers.errors.${result.errors[0]}`);
  }
}
