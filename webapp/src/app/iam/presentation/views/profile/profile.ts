import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../shared/application/language.service';
import { toDisplayDate } from '../../../../shared/domain/date-time';
import { CredentialDirectory } from '../../../../credentials/application/credential-directory.service';
import { Credential } from '../../../../credentials/domain/model/credential.entity';
import { EmptyState } from '../../../../shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { Skeleton } from '../../../../shared/presentation/components/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/presentation/components/status-badge/status-badge';
import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'tp-profile',
  imports: [DatePipe, MatButtonModule, MatIconModule, TranslatePipe, EmptyState, PageHeader, Skeleton, StatusBadge],
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

        @if (u.cardHolderId) {
          <article class="tp-card">
            <h3>{{ 'profile.credential' | translate }}</h3>
            @if (credentialLoading()) {
              <tp-skeleton variant="block" [count]="2" />
            } @else if (credentialFailed()) {
              <tp-empty-state icon="cloud_off" tone="error" [title]="'common.loadErrorTitle' | translate" [message]="'common.loadError' | translate">
                <button mat-flat-button type="button" (click)="loadCredential()"><mat-icon>refresh</mat-icon>{{ 'common.retry' | translate }}</button>
              </tp-empty-state>
            } @else if (credential(); as c) {
              <dl>
                <div><dt>{{ 'profile.cardUid' | translate }}</dt><dd class="uid">{{ c.cardUid }}</dd></div>
                <div><dt>{{ 'profile.cardStatus' | translate }}</dt><dd><tp-status-badge kind="credential" [status]="c.status" /></dd></div>
                <div><dt>{{ 'profile.issuedAt' | translate }}</dt><dd>{{ date(c.issuedAt) | date: 'longDate' : 'UTC' : lang.locale() }}</dd></div>
                <div>
                  <dt>{{ 'profile.lastUsed' | translate }}</dt>
                  <dd>{{ c.lastUsedAt ? (date(c.lastUsedAt) | date: 'd MMM y · HH:mm' : 'UTC' : lang.locale()) : ('credentials.neverUsed' | translate) }}</dd>
                </div>
              </dl>
              @if (!c.isActive()) {
                <p class="warn"><mat-icon>info</mat-icon>{{ 'profile.inactiveCard' | translate }}</p>
              }
            } @else {
              <tp-empty-state icon="credit_card_off" [title]="'profile.noCardTitle' | translate" [message]="'profile.noCardMessage' | translate" />
            }
          </article>
        }
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
    .uid { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; }
    .warn { display: flex; align-items: center; gap: 8px; margin: 16px 0 0; padding: 12px 16px; border-radius: 8px;
      background: var(--tp-warning-bg); color: var(--tp-warning-text); font-size: 13px; font-weight: 500; }
    .warn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class ProfilePage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly directory = inject(CredentialDirectory);
  protected readonly lang = inject(LanguageService);

  protected readonly user = this.auth.currentUser;
  protected readonly credential = signal<Credential | null>(null);
  protected readonly credentialLoading = signal(false);
  protected readonly credentialFailed = signal(false);

  constructor() {
    void this.loadCredential();
  }

  /** D5 · Estado de la credencial del titular vinculado a la cuenta. */
  protected async loadCredential(): Promise<void> {
    const holderId = this.user()?.cardHolderId;
    if (!holderId) return;
    this.credentialLoading.set(true);
    this.credentialFailed.set(false);
    try {
      this.credential.set(await this.directory.credentialOf(holderId));
    } catch {
      this.credentialFailed.set(true);
    } finally {
      this.credentialLoading.set(false);
    }
  }

  protected date(value: string | null): Date | null {
    return toDisplayDate(value);
  }
  protected readonly created = computed(() => toDisplayDate(this.user()?.createdAt));
  protected readonly initials = computed(() =>
    (this.user()?.fullName ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''),
  );

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/login');
  }
}
