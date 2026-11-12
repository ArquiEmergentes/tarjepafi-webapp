import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SESSION_PORT } from '../../../application/session.port';
import { LanguageService } from '../../../application/language.service';
import { SimulatedClock } from '../../../application/simulated-clock.service';
import { NOTIFICATION_SOURCES } from '../../../application/notification.port';
import { toDisplayDate } from '../../../domain/date-time';

@Component({
  selector: 'tp-top-nav',
  imports: [DatePipe, RouterLink, MatIconModule, MatMenuModule, MatButtonModule, MatBadgeModule, MatTooltipModule, TranslatePipe],
  template: `
    <div class="left">
      <span class="chip">
        <mat-icon>location_on</mat-icon>
        {{ 'header.campus' | translate }}
      </span>
      @if (isAdmin()) {
        <a class="chip chip--clock" routerLink="/admin/simulator" [matTooltip]="'header.clockHint' | translate">
          <mat-icon>schedule</mat-icon>
          <span class="clock-label">{{ 'header.simulatedTime' | translate }}</span>
          <strong>{{ now() | date: 'EEE d MMM · HH:mm' : 'UTC' : lang.locale() }}</strong>
        </a>
      } @else {
        <span class="chip chip--clock">
          <mat-icon>schedule</mat-icon>
          <span class="clock-label">{{ 'header.simulatedTime' | translate }}</span>
          <strong>{{ now() | date: 'EEE d MMM · HH:mm' : 'UTC' : lang.locale() }}</strong>
        </span>
      }
    </div>

    <div class="right">
      <div class="lang" role="group" [attr.aria-label]="'header.language' | translate">
        @for (l of lang.available; track l) {
          <button type="button" [class.on]="lang.language() === l" [attr.aria-pressed]="lang.language() === l" (click)="lang.use(l)">
            {{ l.toUpperCase() }}
          </button>
        }
      </div>

      <button
        mat-icon-button
        class="bell"
        [matMenuTriggerFor]="notificationsMenu"
        (menuOpened)="refreshNotifications()"
        [attr.aria-label]="'header.notifications' | translate"
      >
        <mat-icon [matBadge]="notifications().length || null" matBadgeSize="small" matBadgeColor="warn">notifications</mat-icon>
      </button>
      <mat-menu #notificationsMenu="matMenu" xPosition="before" class="tp-menu">
        <div class="menu-title">{{ 'header.notifications' | translate }}</div>
        @for (n of notifications(); track n.id) {
          <button mat-menu-item (click)="open(n.route)">
            <mat-icon [class]="'tone-' + n.tone">{{ n.icon }}</mat-icon>
            <span class="n-text"><strong>{{ n.title }}</strong><small>{{ n.detail }}</small></span>
          </button>
        } @empty {
          <p class="menu-empty">{{ 'header.noNotifications' | translate }}</p>
        }
      </mat-menu>

      @if (user(); as u) {
        <button type="button" class="profile" [matMenuTriggerFor]="profileMenu">
          <span class="avatar">{{ initials() }}</span>
          <span class="who">
            <strong>{{ u.fullName }}</strong>
            <small>{{ 'roles.' + u.role | translate }}</small>
          </span>
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #profileMenu="matMenu" xPosition="before">
          <button mat-menu-item routerLink="/profile"><mat-icon>account_circle</mat-icon>{{ 'nav.profile' | translate }}</button>
          <button mat-menu-item (click)="signOut()"><mat-icon>logout</mat-icon>{{ 'auth.signOut' | translate }}</button>
        </mat-menu>
      }
    </div>
  `,
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: var(--tp-header-height);
      padding: 0 32px; background: var(--tp-white); border-bottom: 1px solid var(--tp-border-soft); }
    .left, .right { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .chip { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--tp-border);
      border-radius: 8px; font-size: 14px; font-weight: 500; color: var(--tp-text); white-space: nowrap; background: var(--tp-white); }
    .chip mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--tp-muted); }
    .chip--clock { background: var(--tp-brand-light); border-color: transparent; color: var(--tp-cyan-text); font-weight: 500; }
    .chip--clock mat-icon { color: var(--tp-cyan-text); }
    a.chip--clock:hover { text-decoration: none; filter: brightness(0.97); }
    .clock-label { font-size: 12px; }
    .lang { display: inline-flex; padding: 2px; border: 1px solid var(--tp-border); border-radius: 8px; }
    .lang button { border: 0; background: transparent; height: 30px; min-width: 36px; border-radius: 6px; font: 600 12px var(--tp-font-ui);
      color: var(--tp-muted); cursor: pointer; }
    .lang button.on { background: var(--tp-navy); color: #ffffff; }
    .profile { display: flex; align-items: center; gap: 8px; border: 0; background: transparent; cursor: pointer; padding: 4px 8px; border-radius: 8px; font-family: inherit; }
    .profile:hover { background: var(--tp-bg); }
    .avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--tp-brand-light);
      color: var(--tp-cyan-text); font-size: 13px; font-weight: 700; }
    .who { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; text-align: left; }
    .who strong { font-size: 14px; color: var(--tp-text); }
    .who small { font-size: 12px; color: var(--tp-muted); }
    .menu-title { padding: 12px 16px 4px; font-weight: 600; font-size: 14px; }
    .menu-empty { padding: 8px 16px 16px; margin: 0; color: var(--tp-muted); font-size: 13px; max-width: 280px; }
    .n-text { display: flex; flex-direction: column; line-height: 1.3; padding: 6px 0; }
    .n-text small { color: var(--tp-muted); }
    .tone-error { color: var(--tp-error) !important; }
    .tone-warning { color: var(--tp-warning) !important; }
    .tone-info { color: var(--tp-info) !important; }
    @media (max-width: 1100px) { .clock-label, .who { display: none; } }
    @media (max-width: 720px) { :host { padding: 0 16px; } .chip:not(.chip--clock) { display: none; } }
  `,
})
export class TopNav {
  private readonly session = inject(SESSION_PORT);
  private readonly router = inject(Router);
  private readonly clock = inject(SimulatedClock);
  private readonly sources = inject(NOTIFICATION_SOURCES, { optional: true }) ?? [];
  protected readonly lang = inject(LanguageService);

  protected readonly user = this.session.user;
  protected readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  protected readonly now = computed(() => toDisplayDate(this.clock.now()));
  protected readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join(''),
  );

  private readonly activeSources = computed(() => {
    const role = this.user()?.role;
    return role ? this.sources.filter((s) => s.roles.includes(role)) : [];
  });
  protected readonly notifications = computed(() => this.activeSources().flatMap((s) => s.notifications()));

  protected refreshNotifications(): void {
    for (const s of this.activeSources()) s.refresh();
  }

  protected open(route?: string): void {
    if (route) void this.router.navigateByUrl(route);
  }

  protected signOut(): void {
    this.session.signOut();
    void this.router.navigateByUrl('/login');
  }
}
