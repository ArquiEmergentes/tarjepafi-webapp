import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SESSION_PORT } from '../../../application/session.port';
import { EmptyState } from '../../components/empty-state/empty-state';

/** Portal de Estudiante y Trabajador (Sprint 2). */
@Component({
  selector: 'tp-coming-soon',
  imports: [EmptyState, MatButtonModule, RouterLink, TranslatePipe],
  template: `
    <section class="tp-page">
      <div class="tp-card">
        <tp-empty-state
          icon="hourglass_top"
          [title]="'comingSoon.title' | translate"
          [message]="'comingSoon.message' | translate: { name: firstName() }"
        >
          <a mat-stroked-button routerLink="/profile">{{ 'nav.profile' | translate }}</a>
        </tp-empty-state>
      </div>
    </section>
  `,
})
export class ComingSoonPage {
  private readonly session = inject(SESSION_PORT);
  protected readonly firstName = computed(() => this.session.user()?.fullName.split(' ')[0] ?? '');
}
