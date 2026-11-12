import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { toDisplayDate } from '../../../../shared/domain/date-time';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'tp-profile',
  imports: [DatePipe, MatButtonModule, MatIconModule, TranslatePipe, PageHeader, StatusBadge],
  template: `
    <section class="tp-page">
      <tp-page-header [title]="'profile.title' | translate" [subtitle]="'profile.subtitle' | translate">
        <button mat-stroked-button type="button" (click)="signOut()"><mat-icon>logout</mat-icon>{{ 'auth.signOut' | translate }}</button>
      </tp-page-header>

      @if (user(); as u) {
        <article class="tp-card identity">
          <span class="avatar">{{ initials() }}</span>
          <div>
            <h2>{{ u.fullName }}</h2>
            <p class="tp-muted">{{ u.email }}</p>
          </div>
        </article>

        <article class="tp-card">
          <h3>{{ 'profile.account' | translate }}</h3>
          <dl>
            <div><dt>{{ 'profile.role' | translate }}</dt><dd><tp-status-badge kind="role" [status]="u.role" [label]="'roles.' + u.role" /></dd></div>
            <div><dt>{{ 'profile.status' | translate }}</dt><dd><tp-status-badge kind="user" [status]="u.status" /></dd></div>
            <div><dt>{{ 'profile.email' | translate }}</dt><dd>{{ u.email }}</dd></div>
            <div><dt>{{ 'profile.createdAt' | translate }}</dt><dd>{{ created() | date: 'longDate' : 'UTC' : lang.locale() }}</dd></div>
            <div><dt>{{ 'profile.campus' | translate }}</dt><dd>{{ 'header.campus' | translate }}</dd></div>
          </dl>
        </article>
      }
    </section>
  `,
  styles: `
    .identity { display: flex; align-items: center; gap: 24px; }
    .identity p { margin: 4px 0 0; }
    .avatar { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--tp-brand-light);
      color: var(--tp-cyan-text); font: 700 22px var(--tp-font-title); flex: none; }
    h3 { margin-bottom: 16px; }
    dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin: 0; }
    dt { font-size: 12px; font-weight: 500; color: var(--tp-muted); margin-bottom: 4px; }
    dd { margin: 0; font-size: 14px; font-weight: 500; }
  `,
})
export class ProfilePage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly lang = inject(LanguageService);

  protected readonly user = this.auth.currentUser;
  protected readonly created = computed(() => toDisplayDate(this.user()?.createdAt));
  protected readonly initials = computed(() =>
    (this.user()?.fullName ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''),
  );

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/login');
  }
}
