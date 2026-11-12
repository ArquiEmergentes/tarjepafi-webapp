import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { SpaceCatalog } from '../../../../space-facility/application/space-catalog.service';
import { SimulatedClock } from '../../../../shared/application/simulated-clock.service';
import { elapsedSince } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Pagination } from '../../../../shared/presentation/components/pagination/pagination';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { ReadersStore } from '../../../application/readers.store';
import { DEVICE_TYPES, DeviceType, READER_STATUSES, Reader, ReaderAction, ReaderStatus } from '../../../domain/model/reader.entity';
import { ReaderActions } from '../../reader-actions.service';

const PAGE_SIZE = 10;

/** A4 · Lectores IoT: lista con contadores por estado, filtros y alta de lectores. */
@Component({
  selector: 'tp-reader-list',
  imports: [
    FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule,
    MatSelectModule, TranslatePipe, EmptyState, KpiCard, PageHeader, Pagination, Skeleton, StatusBadge,
  ],
  templateUrl: './reader-list.html',
  styleUrl: './reader-list.scss',
})
export class ReaderListPage implements OnInit {
  private readonly store = inject(ReadersStore);
  private readonly catalog = inject(SpaceCatalog);
  private readonly actions = inject(ReaderActions);
  private readonly toast = inject(ToastService);
  private readonly clock = inject(SimulatedClock);
  private readonly router = inject(Router);

  protected readonly statuses = READER_STATUSES;
  protected readonly types = DEVICE_TYPES;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly loading = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly failed = computed(() => this.store.loadError() && !this.store.loaded());
  protected readonly counts = this.store.countByStatus;
  protected readonly total = computed(() => this.store.readers().length);
  protected readonly online = computed(() => this.counts().ACTIVE + this.counts().DEGRADED);
  protected readonly spaces = this.catalog.spaces;
  protected readonly spaceById = this.catalog.byId;
  protected readonly openIncidentsByReader = computed(() => {
    const map = new Map<string, number>();
    for (const i of this.store.openIncidents()) map.set(i.readerId, (map.get(i.readerId) ?? 0) + 1);
    return map;
  });

  protected readonly search = signal('');
  protected readonly status = signal<ReaderStatus | 'ALL'>('ALL');
  protected readonly type = signal<DeviceType | 'ALL'>('ALL');
  protected readonly spaceId = signal<string>('ALL');
  protected readonly page = signal(0);
  protected readonly busyId = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store.readers().filter((r) => {
      if (this.status() !== 'ALL' && r.status !== this.status()) return false;
      if (this.type() !== 'ALL' && r.deviceType !== this.type()) return false;
      if (this.spaceId() !== 'ALL' && r.spaceId !== this.spaceId()) return false;
      return !term || r.id.toLowerCase().includes(term) || r.name.toLowerCase().includes(term);
    });
  });
  protected readonly visible = computed(() => this.filtered().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));
  protected readonly hasFilters = computed(
    () => !!this.search().trim() || this.status() !== 'ALL' || this.type() !== 'ALL' || this.spaceId() !== 'ALL',
  );

  constructor() {
    effect(() => {
      this.search();
      this.status();
      this.type();
      this.spaceId();
      this.page.set(0);
    });
    // Al mover la hora simulada se vuelve a evaluar la conectividad (lectores sin heartbeat → OFFLINE).
    effect(() => {
      this.clock.now();
      if (untracked(() => this.store.loaded())) void this.store.evaluateConnectivity();
    });
  }

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    const [, spacesOk] = await Promise.all([
      this.store.load(),
      new Promise<boolean>((resolve) => this.catalog.load().subscribe({ next: () => resolve(true), error: () => resolve(false) })),
    ]);
    if (this.store.loadError() || !spacesOk) this.toast.errorWithRetry('common.loadError', () => void this.reload());
  }

  protected toggleStatus(s: ReaderStatus): void {
    this.status.set(this.status() === s ? 'ALL' : s);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('ALL');
    this.type.set('ALL');
    this.spaceId.set('ALL');
  }

  protected location(r: Reader): string {
    const s = this.spaceById().get(r.spaceId);
    return s ? `${s.name} · ${s.building}` : r.spaceId;
  }

  protected lastSeen(r: Reader) {
    return r.lastSeenAt ? elapsedSince(this.clock.now(), r.lastSeenAt) : null;
  }

  protected isStale(r: Reader): boolean {
    return r.status === 'OFFLINE' || (r.isMonitored() && r.hasLostConnection(this.clock.now()));
  }

  protected icon(action: ReaderAction): string {
    return this.actions.icon(action);
  }

  protected async run(r: Reader, action: ReaderAction): Promise<void> {
    this.busyId.set(r.id);
    await this.actions.run(r, action);
    this.busyId.set(null);
  }

  protected async register(): Promise<void> {
    const reader = await this.actions.register();
    if (reader) void this.router.navigate(['/admin/readers', reader.id]);
  }
}
