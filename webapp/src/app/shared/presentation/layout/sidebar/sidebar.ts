import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { SESSION_PORT } from '../../../application/session.port';
import { BrandLogo } from '../../components/brand-logo/brand-logo';
import { NAVIGATION } from '../navigation';

@Component({
  selector: 'tp-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, TranslatePipe, BrandLogo],
  template: `
    <div class="brand"><tp-brand-logo [inverse]="true" [compact]="collapsed()" /></div>
    <nav [attr.aria-label]="'nav.main' | translate">
      @for (section of sections(); track section.titleKey) {
        <p class="section">{{ collapsed() ? '' : (section.titleKey | translate) }}</p>
        <ul>
          @for (item of section.items; track item.route) {
            <li>
              <a
                [routerLink]="item.route"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                [matTooltip]="collapsed() ? (item.labelKey | translate) : ''"
                matTooltipPosition="right"
                ariaCurrentWhenActive="page"
              >
                <mat-icon>{{ item.icon }}</mat-icon>
                @if (!collapsed()) {
                  <span>{{ item.labelKey | translate }}</span>
                }
              </a>
            </li>
          }
        </ul>
      }
    </nav>
    <button type="button" class="collapse" (click)="toggle.emit()" [attr.aria-expanded]="!collapsed()">
      <mat-icon>{{ collapsed() ? 'left_panel_open' : 'left_panel_close' }}</mat-icon>
      @if (!collapsed()) {
        <span>{{ 'nav.collapse' | translate }}</span>
      }
    </button>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; background: var(--tp-navy); color: #cbd5e1; padding: 16px 12px; gap: 8px; overflow-y: auto; }
    .brand { height: 48px; display: flex; align-items: center; padding: 0 8px; margin-bottom: 8px; }
    :host(.collapsed) .brand { justify-content: center; padding: 0; }
    nav { flex: 1; }
    .section { margin: 16px 8px 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #7f93ad; min-height: 14px; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    a, .collapse { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; border-radius: 8px;
      color: #cbd5e1; font-size: 14px; font-weight: 500; text-decoration: none; }
    a:hover, .collapse:hover { background: var(--tp-navy-600); color: #ffffff; text-decoration: none; }
    a.active { background: var(--tp-cyan); color: #ffffff; font-weight: 600; }
    :host(.collapsed) a, :host(.collapsed) .collapse { justify-content: center; padding: 0; }
    mat-icon { flex: none; font-size: 20px; width: 20px; height: 20px; }
    .collapse { border: 0; background: transparent; cursor: pointer; font-family: inherit; width: 100%;
      border-top: 1px solid rgb(255 255 255 / 8%); border-radius: 0; margin-top: 8px; padding-top: 8px; height: 48px; }
  `,
  host: { '[class.collapsed]': 'collapsed()' },
})
export class Sidebar {
  private readonly session = inject(SESSION_PORT);
  readonly collapsed = input(false);
  readonly toggle = output<void>();

  protected readonly sections = computed(() => {
    const user = this.session.user();
    return user ? NAVIGATION[user.role] : [];
  });
}
