import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tp-kpi-card',
  imports: [MatIconModule],
  template: `
    <article class="tp-card kpi">
      <header>
        <span class="label">{{ label() }}</span>
        @if (icon()) {
          <span class="icon" [class]="'icon icon--' + tone()"><mat-icon>{{ icon() }}</mat-icon></span>
        }
      </header>
      <p class="value">
        {{ value() }}
        @if (suffix()) {
          <span class="suffix">{{ suffix() }}</span>
        }
      </p>
      @if (caption()) {
        <p class="caption">{{ caption() }}</p>
      }
      <ng-content />
    </article>
  `,
  styles: `
    .kpi { display: flex; flex-direction: column; gap: 8px; height: 100%; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .label { font-size: 14px; font-weight: 500; color: var(--tp-muted); }
    .icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; }
    .icon--brand { background: var(--tp-brand-light); color: var(--tp-cyan-text); }
    .icon--success { background: var(--tp-success-bg); color: var(--tp-success); }
    .icon--warning { background: var(--tp-warning-bg); color: var(--tp-warning-text); }
    .icon--error { background: var(--tp-error-bg); color: var(--tp-error); }
    .value { margin: 0; font-family: var(--tp-font-title); font-size: 30px; line-height: 38px; font-weight: 600; color: var(--tp-text); }
    .suffix { font-family: var(--tp-font-ui); font-size: 14px; font-weight: 500; color: var(--tp-muted); }
    .caption { margin: 0; font-size: 12px; font-weight: 500; color: var(--tp-muted); }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly suffix = input<string>();
  readonly caption = input<string>();
  readonly icon = input<string>();
  readonly tone = input<'brand' | 'success' | 'warning' | 'error'>('brand');
}
