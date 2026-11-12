import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { CredentialDirectory } from '../../../../credentials/application/credential-directory.service';
import { LanguageService } from '../../../../shared/application/language.service';
import { toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Pagination } from '../../../../shared/presentation/components/pagination/pagination';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { AccessRecordsQuery } from '../../../application/access-records.query';
import { SpaceCatalog } from '../../../application/space-catalog.service';
import { AccessDecision, AccessRecord, AccessType } from '../../../domain/model/access-record.entity';

const PAGE_SIZE = 12;

/** A6 · Registros de acceso (US12): lector, titular, tipo, decisión y motivo. */
@Component({
  selector: 'tp-access-records',
  imports: [
    DatePipe, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, TranslatePipe,
    EmptyState, KpiCard, PageHeader, Pagination, Skeleton, StatusBadge,
  ],
  templateUrl: './access-records.html',
  styleUrl: './access-records.scss',
})
export class AccessRecordsPage implements OnInit {
  private readonly query = inject(AccessRecordsQuery);
  private readonly spaces = inject(SpaceCatalog);
  private readonly directory = inject(CredentialDirectory);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly types: AccessType[] = ['CAMPUS_ENTRY', 'CAMPUS_EXIT', 'SPACE_ACCESS'];
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly records = signal<AccessRecord[]>([]);

  protected readonly decision = signal<AccessDecision | 'ALL'>('ALL');
  protected readonly type = signal<AccessType | 'ALL'>('ALL');
  protected readonly spaceId = signal('ALL');
  protected readonly search = signal('');
  protected readonly page = signal(0);

  protected readonly spaceList = this.spaces.spaces;
  protected readonly spaceById = this.spaces.byId;
  protected readonly holders = this.directory.holdersById;

  protected readonly granted = computed(() => this.records().filter((r) => r.isGranted()).length);
  protected readonly denied = computed(() => this.records().length - this.granted());
  protected readonly grantedRate = computed(() =>
    this.records().length ? Math.round((this.granted() / this.records().length) * 1000) / 10 : 0,
  );
  protected readonly topDenial = computed(() => {
    const counts = new Map<string, number>();
    for (const r of this.records().filter((x) => !x.isGranted())) counts.set(r.denialReason, (counts.get(r.denialReason) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  });

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const holders = this.holders();
    return this.records().filter((r) => {
      if (this.decision() !== 'ALL' && r.decision !== this.decision()) return false;
      if (this.type() !== 'ALL' && r.accessType !== this.type()) return false;
      if (this.spaceId() !== 'ALL' && r.spaceId !== this.spaceId()) return false;
      if (!term) return true;
      const h = r.cardHolderId ? holders.get(r.cardHolderId) : undefined;
      return [r.cardUid, r.readerId, h?.fullName, h?.code].some((v) => v?.toLowerCase().includes(term));
    });
  });
  protected readonly visible = computed(() => this.filtered().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));
  protected readonly hasFilters = computed(
    () => !!this.search().trim() || this.decision() !== 'ALL' || this.type() !== 'ALL' || this.spaceId() !== 'ALL',
  );

  constructor() {
    effect(() => {
      this.decision();
      this.type();
      this.spaceId();
      this.search();
      this.page.set(0);
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      const [records] = await Promise.all([this.query.all(), firstValueFrom(this.spaces.load()), this.directory.ensureHolders()]);
      this.records.set(records);
    } catch {
      this.failed.set(true);
      this.toast.errorWithRetry('common.loadError', () => void this.load());
    } finally {
      this.loading.set(false);
    }
  }

  protected clearFilters(): void {
    this.decision.set('ALL');
    this.type.set('ALL');
    this.spaceId.set('ALL');
    this.search.set('');
  }

  protected date(r: AccessRecord): Date | null {
    return toDisplayDate(r.attemptedAt);
  }
}
