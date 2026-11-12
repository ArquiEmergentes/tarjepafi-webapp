import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type BarTone = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BarItem {
  id: string;
  /** Texto ya traducido. */
  label: string;
  value: number;
  tone: BarTone;
  icon?: string;
  /** Texto a la derecha del valor (por ejemplo "/ 20" o "78 %"). */
  caption?: string;
}

/**
 * Barras horizontales con etiqueta, icono y valor (parte de un total o comparación entre categorías).
 * El color acompaña al icono y al texto: nunca es la única pista.
 */
@Component({
  selector: 'tp-bar-list',
  imports: [MatIconModule],
  template: `
    <ul [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.id) {
        <li [title]="item.label + ': ' + item.value + (item.caption ? ' ' + item.caption : '')">
          <span class="label">
            @if (item.icon) {
              <mat-icon [class]="'tone-' + item.tone">{{ item.icon }}</mat-icon>
            }
            <span class="text">{{ item.label }}</span>
          </span>
          <span class="track" aria-hidden="true">
            <span class="fill" [class]="'fill fill--' + item.tone" [style.width.%]="width(item)"></span>
          </span>
          <span class="value">
            <strong>{{ item.value }}</strong>
            @if (item.caption) {
              <small>{{ item.caption }}</small>
            }
          </span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
    li { display: grid; grid-template-columns: minmax(120px, 42%) 1fr auto; align-items: center; gap: 16px; }
    .label { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; font-weight: 500; }
    .text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label mat-icon { font-size: 18px; width: 18px; height: 18px; flex: none; }
    .track { height: 8px; border-radius: 4px; background: var(--tp-neutral-bg); overflow: hidden; }
    .fill { display: block; height: 100%; border-radius: 4px; min-width: 2px; transition: width 0.3s ease; }
    .fill--brand { background: var(--tp-cyan); }
    .fill--success { background: var(--tp-success); }
    .fill--warning { background: var(--tp-warning); }
    .fill--error { background: var(--tp-error); }
    .fill--info { background: var(--tp-info); }
    .fill--neutral { background: #94a3b8; }
    .tone-brand { color: var(--tp-cyan-text); }
    .tone-success { color: var(--tp-success); }
    .tone-warning { color: var(--tp-warning-text); }
    .tone-error { color: var(--tp-error); }
    .tone-info { color: var(--tp-info); }
    .tone-neutral { color: var(--tp-muted); }
    .value { display: flex; align-items: baseline; gap: 4px; justify-content: flex-end; min-width: 56px; font-variant-numeric: tabular-nums; }
    .value strong { font-size: 14px; color: var(--tp-text); }
    .value small { font-size: 12px; color: var(--tp-muted); font-weight: 500; }
    @media (prefers-reduced-motion: reduce) { .fill { transition: none; } }
  `,
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  /** Valor que representa el 100 % de la barra (por defecto, el mayor). */
  readonly max = input<number>();
  readonly ariaLabel = input('');

  private readonly scale = computed(() => this.max() ?? Math.max(1, ...this.items().map((i) => i.value)));

  protected width(item: BarItem): number {
    return Math.min(100, (item.value / this.scale()) * 100);
  }
}
