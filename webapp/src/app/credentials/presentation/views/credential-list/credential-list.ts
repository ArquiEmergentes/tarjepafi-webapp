import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { toDisplayDate } from '../../../../shared/domain/date-time';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/presentation/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Pagination } from '../../../../shared/presentation/components/pagination/pagination';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { ToastService } from '../../../../shared/presentation/services/toast.service';
import { CredentialRow, CredentialsStore } from '../../../application/credentials.store';
import { CredentialAction, CredentialStatus } from '../../../domain/model/credential.entity';
import { CredentialActions } from '../../credential-actions.service';

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'STAFF' | 'UNLINKED';
type StatusFilter = 'ALL' | CredentialStatus;

const PAGE_SIZE = 10;
const KPIS: { status: CredentialStatus; icon: string; tone: 'success' | 'error' | 'warning' | 'brand' }[] = [
  { status: 'ACTIVE', icon: 'credit_card', tone: 'success' },
  { status: 'BLOCKED', icon: 'credit_card_off', tone: 'error' },
  { status: 'LOST', icon: 'report', tone: 'warning' },
  { status: 'DEACTIVATED', icon: 'do_not_disturb_on', tone: 'brand' },
];

/** A2 · Credenciales: titulares y tarjetas con búsqueda, filtros y acciones rápidas. */
@Component({
  selector: 'tp-credential-list',
  imports: [
    DatePipe, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule,
    MatSelectModule, TranslatePipe, EmptyState, KpiCard, PageHeader, Pagination, Skeleton, StatusBadge,
  ],
  templateUrl: './credential-list.html',
  styleUrl: './credential-list.scss',
})
export class CredentialListPage implements OnInit {
  private readonly store = inject(CredentialsStore);
  private readonly actions = inject(CredentialActions);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LanguageService);

  protected readonly kpis = KPIS;
  protected readonly roleOptions: RoleFilter[] = ['ALL', 'STUDENT', 'TEACHER', 'STAFF', 'UNLINKED'];
  protected readonly statusOptions: StatusFilter[] = ['ALL', 'ACTIVE', 'BLOCKED', 'LOST', 'DEACTIVATED'];
  protected readonly pageSize = PAGE_SIZE;

  protected readonly loading = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly failed = computed(() => this.store.loadError() && !this.store.loaded());
  protected readonly counts = this.store.countByStatus;
  protected readonly total = this.store.total;

  protected readonly search = signal('');
  protected readonly role = signal<RoleFilter>('ALL');
  protected readonly status = signal<StatusFilter>('ALL');
  protected readonly page = signal(0);
  protected readonly busyId = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const role = this.role();
    const status = this.status();
    return this.store.rows().filter(({ credential, holder }) => {
      if (status !== 'ALL' && credential.status !== status) return false;
      if (role === 'UNLINKED' && holder) return false;
      if (role !== 'ALL' && role !== 'UNLINKED' && holder?.role !== role) return false;
      if (!term) return true;
      return [credential.cardUid, holder?.fullName, holder?.code, holder?.email]
        .some((v) => v?.toLowerCase().includes(term));
    });
  });
  protected readonly visible = computed(() => this.filtered().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));
  protected readonly hasFilters = computed(() => this.search().trim() !== '' || this.role() !== 'ALL' || this.status() !== 'ALL');

  constructor() {
    // Al cambiar un filtro se vuelve a la primera página.
    effect(() => {
      this.search();
      this.role();
      this.status();
      this.page.set(0);
    });
  }

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await this.store.load();
    if (this.store.loadError()) this.toast.errorWithRetry('common.loadError', () => void this.reload());
  }

  protected clearFilters(): void {
    this.search.set('');
    this.role.set('ALL');
    this.status.set('ALL');
  }

  protected percent(count: number): number {
    return this.total() === 0 ? 0 : Math.round((count / this.total()) * 1000) / 10;
  }

  protected lastUsed(row: CredentialRow): Date | null {
    return toDisplayDate(row.credential.lastUsedAt);
  }

  /** Acción rápida visible en la fila, como en el mock-up (el resto va en el menú). */
  protected quickAction(row: CredentialRow): CredentialAction | null {
    if (row.credential.canBeBlocked()) return 'BLOCK';
    if (row.credential.status === 'BLOCKED') return 'REACTIVATE';
    if (row.credential.status === 'LOST') return 'DEACTIVATE';
    return null;
  }

  protected async run(row: CredentialRow, action: CredentialAction): Promise<void> {
    this.busyId.set(row.credential.id);
    await this.actions.run(row, action);
    this.busyId.set(null);
  }

  protected async link(row: CredentialRow): Promise<void> {
    this.busyId.set(row.credential.id);
    await this.actions.link(row);
    this.busyId.set(null);
  }
}
