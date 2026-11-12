import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyState } from '../../components/empty-state/empty-state';

@Component({
  selector: 'tp-access-denied',
  imports: [EmptyState, MatButtonModule, RouterLink, TranslatePipe],
  template: `
    <section class="tp-page">
      <div class="tp-card">
        <tp-empty-state icon="lock" tone="error" [title]="'accessDenied.title' | translate" [message]="'accessDenied.message' | translate">
          <a mat-flat-button routerLink="/">{{ 'accessDenied.goHome' | translate }}</a>
        </tp-empty-state>
      </div>
    </section>
  `,
})
export class AccessDeniedPage {}
