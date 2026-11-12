import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import { CredentialDirectory } from '../../../../credentials/application/credential-directory.service';
import { CardHolder } from '../../../../credentials/domain/model/card-holder.entity';
import { Credential } from '../../../../credentials/domain/model/credential.entity';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { LocalDateTime, elapsedSince, toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { FieldError } from '../../../../shared/presentation/components/field-error/field-error';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { NfcSimulator, SimulatedTap, SimulationClockControl } from '../../../application/nfc-simulator.service';
import { ReadersStore } from '../../../application/readers.store';
import { CardTapEvent } from '../../../domain/model/card-tap-event.entity';
import { Reader } from '../../../domain/model/reader.entity';

interface CardOption {
  credential: Credential;
  holder: CardHolder | null;
}

interface Preset {
  key: string;
  readerId: string;
  holderCode?: string;
  uid?: string;
}

/** Escenarios rápidos para la exposición. */
const PRESETS: Preset[] = [
  { key: 'studentClass', readerId: 'RDR-A-301', holderCode: 'U202312966' },
  { key: 'teacherClass', readerId: 'RDR-A-301', holderCode: 'D0001' },
  { key: 'studentRestricted', readerId: 'RDR-D-003', holderCode: 'U202312966' },
  { key: 'staffExit', readerId: 'RDR-T-003', holderCode: 'T0001' },
  { key: 'unknownCard', readerId: 'RDR-D-003', uid: '04:FF:12:AB:90' },
];

/** A5 · Simulador de lector NFC. */
@Component({
  selector: 'tp-simulator',
  imports: [
    DatePipe, FormsModule, RouterLink, MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule, TranslatePipe,
    EmptyState, FieldError, PageHeader, Skeleton, StatusBadge,
  ],
  templateUrl: './simulator.html',
  styleUrl: './simulator.scss',
})
export class SimulatorPage implements OnInit {
  private readonly simulator = inject(NfcSimulator);
  private readonly clockControl = inject(SimulationClockControl);
  private readonly readersStore = inject(ReadersStore);
  private readonly directory = inject(CredentialDirectory);
  private readonly spaces = inject(SpaceCatalog);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly presets = PRESETS;
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly clockBusy = signal(false);

  protected readonly readers = this.readersStore.readers;
  protected readonly failing = this.readersStore.failing;
  protected readonly history = this.simulator.history;
  protected readonly now = this.clockControl.now;

  protected readonly readerId = signal<string>('RDR-A-301');
  protected readonly uidInput = signal('');
  protected readonly uidError = signal<string | null>(null);
  protected readonly clockInput = signal('');
  protected readonly last = signal<SimulatedTap | null>(null);

  private readonly cards = signal<CardOption[]>([]);
  protected readonly reader = computed(() => this.readers().find((r) => r.id === this.readerId()));
  protected readonly space = computed(() => {
    const r = this.reader();
    return r ? this.spaces.byId().get(r.spaceId) : undefined;
  });
  protected readonly holderByUid = computed(() => new Map(this.cards().map((c) => [c.credential.cardUid, c.holder])));
  protected readonly cardOptions = computed(() => {
    const term = this.uidInput().trim().toLowerCase();
    const list = this.cards();
    const filtered = term
      ? list.filter((c) => [c.credential.cardUid, c.holder?.fullName, c.holder?.code].some((v) => v?.toLowerCase().includes(term)))
      : list;
    return filtered.slice(0, 40);
  });
  protected readonly selectedCard = computed(() => {
    const uid = CardTapEvent.normalizeUid(this.uidInput());
    return this.cards().find((c) => c.credential.cardUid === uid) ?? null;
  });
  /** Lectores que deberían enviar heartbeats (para la simulación de fallas). */
  protected readonly monitored = computed(() => this.readers().filter((r) => r.isMonitored() || this.failing().has(r.id)));

  async ngOnInit(): Promise<void> {
    this.clockInput.set(this.now().slice(0, 16));
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      await Promise.all([
        this.readersStore.load(),
        firstValueFrom(this.spaces.load()),
        this.directory.ensureHolders(),
        this.simulator.loadHistory(),
      ]);
      if (this.readersStore.loadError()) throw new Error('readers');
      const credentials = await this.directory.credentials();
      const holders = this.directory.holdersById();
      this.cards.set(
        credentials
          .map((credential) => ({ credential, holder: credential.cardHolderId ? (holders.get(credential.cardHolderId) ?? null) : null }))
          .sort((a, b) => (a.holder?.fullName ?? '~').localeCompare(b.holder?.fullName ?? '~')),
      );
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Hora simulada ----------

  protected async moveClock(minutes: number): Promise<void> {
    await this.runClock(() => this.clockControl.advance(minutes));
  }

  protected async applyClock(): Promise<void> {
    const value = this.clockInput();
    if (!value) return;
    await this.runClock(() => this.clockControl.moveTo(`${value.slice(0, 16)}:00`));
  }

  protected async resetClock(): Promise<void> {
    await this.runClock(() => this.clockControl.moveTo(environment.initialSimulatedTime));
  }

  private async runClock(action: () => Promise<void>): Promise<void> {
    this.clockBusy.set(true);
    try {
      await action();
      this.clockInput.set(this.now().slice(0, 16));
      this.toast.info('simulator.clock.moved', { time: this.now().replace('T', ' ').slice(0, 16) });
    } catch {
      this.toast.error('common.saveError');
    } finally {
      this.clockBusy.set(false);
    }
  }

  // ---------- Lectura ----------

  protected applyPreset(preset: Preset): void {
    this.readerId.set(preset.readerId);
    const uid = preset.uid ?? this.cards().find((c) => c.holder?.code === preset.holderCode && c.credential.isActive())?.credential.cardUid;
    this.uidInput.set(uid ?? '');
    this.uidError.set(null);
  }

  protected async tap(): Promise<void> {
    const uid = CardTapEvent.normalizeUid(this.uidInput());
    if (!CardTapEvent.isValidUid(uid)) {
      this.uidError.set('simulator.errors.uid');
      return;
    }
    this.uidError.set(null);
    this.busy.set(true);
    try {
      this.last.set(await this.simulator.tap(this.readerId(), uid));
    } catch {
      this.toast.errorWithRetry('simulator.errors.tapFailed', () => void this.tap());
    } finally {
      this.busy.set(false);
    }
  }

  protected async replay(event: CardTapEvent): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.simulator.replay(event);
      this.last.set(result);
      this.toast.info('simulator.replayed', { id: event.id });
    } catch {
      this.toast.error('simulator.errors.tapFailed');
    } finally {
      this.busy.set(false);
    }
  }

  protected toggleFailure(reader: Reader, failing: boolean): void {
    this.readersStore.setFailing(reader.id, failing);
    this.toast.info(failing ? 'simulator.connectivity.failureOn' : 'simulator.connectivity.failureOff', { id: reader.id });
  }

  // ---------- Presentación ----------

  protected date(value: LocalDateTime | null | undefined): Date | null {
    return toDisplayDate(value);
  }

  protected elapsed(value: LocalDateTime | null) {
    return value ? elapsedSince(this.now(), value) : null;
  }

  protected readerName(id: string): string {
    return this.readers().find((r) => r.id === id)?.name ?? id;
  }

  protected toneIcon(tone: string): string {
    return tone === 'success' ? 'check_circle' : tone === 'info' ? 'info' : 'cancel';
  }
}
