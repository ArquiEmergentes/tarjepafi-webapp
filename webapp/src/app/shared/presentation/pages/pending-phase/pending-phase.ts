import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../components/page-header/page-header';
import { EmptyState } from '../../components/empty-state/empty-state';

/** Marcador temporal para pantallas de fases posteriores del Sprint 1. Se reemplaza fase a fase. */
@Component({
  selector: 'tp-pending-phase',
  imports: [PageHeader, EmptyState, TranslatePipe],
  template: `
    <section class="tp-page">
      <tp-page-header [title]="titleKey | translate" />
      <div class="tp-card">
        <tp-empty-state icon="construction" [title]="'pendingPhase.title' | translate" [message]="'pendingPhase.message' | translate: { phase }" />
      </div>
    </section>
  `,
})
export class PendingPhasePage {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly titleKey = String(this.data['titleKey'] ?? '');
  protected readonly phase = String(this.data['phase'] ?? '');
}
