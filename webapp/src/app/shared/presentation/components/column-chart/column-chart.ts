import { Component, computed, input, signal } from '@angular/core';

export interface ColumnPoint {
  label: string;
  value: number;
  /** Texto del tooltip (por defecto, "label · value"). */
  tooltip?: string;
}

/** Columnas verticales de una sola serie (un color), ancladas a la línea base y con tooltip al pasar el cursor. */
@Component({
  selector: 'tp-column-chart',
  template: `
    <div class="chart" role="img" [attr.aria-label]="ariaLabel()">
      <div class="grid" aria-hidden="true">
        @for (t of ticks(); track t) {
          <span class="tick"><small>{{ t }}</small></span>
        }
      </div>
      <div class="cols">
        @for (p of points(); track p.label; let i = $index) {
          <div class="col" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)" (focus)="hover.set(i)" (blur)="hover.set(null)" tabindex="0"
            [attr.aria-label]="p.tooltip ?? p.label + ' · ' + p.value">
            @if (hover() === i) {
              <span class="tip">{{ p.tooltip ?? p.label + ' · ' + p.value }}</span>
            }
            <span class="bar" [class.bar--active]="hover() === i" [style.height.%]="height(p.value)"></span>
            <span class="x">{{ p.label }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .chart { position: relative; height: 220px; padding: 8px 0 24px 32px; }
    .grid { position: absolute; inset: 8px 0 24px 32px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
    .tick { position: relative; border-top: 1px solid var(--tp-border-soft); height: 0; }
    .tick small { position: absolute; left: -32px; top: -8px; width: 26px; text-align: right; font-size: 11px; color: var(--tp-muted); }
    .cols { position: relative; height: 100%; display: flex; align-items: flex-end; gap: 6px; }
    .col { position: relative; flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; outline: none; cursor: default; }
    .bar { width: 100%; max-width: 40px; min-height: 2px; background: var(--tp-cyan); border-radius: 4px 4px 0 0; opacity: 0.85; transition: opacity 0.15s ease; }
    .bar--active, .col:focus-visible .bar { opacity: 1; box-shadow: 0 0 0 2px var(--tp-white), 0 0 0 4px var(--tp-cyan); }
    .x { position: absolute; bottom: -20px; font-size: 11px; color: var(--tp-muted); white-space: nowrap; }
    .tip { position: absolute; bottom: calc(100% + 4px); white-space: nowrap; z-index: 1; padding: 4px 8px; border-radius: 6px;
      background: var(--tp-text); color: #ffffff; font-size: 12px; font-weight: 600; pointer-events: none; }
    .col .tip { bottom: auto; top: -4px; transform: translateY(-100%); }
  `,
})
export class ColumnChart {
  readonly points = input.required<ColumnPoint[]>();
  readonly ariaLabel = input('');
  protected readonly hover = signal<number | null>(null);

  private readonly max = computed(() => {
    const raw = Math.max(1, ...this.points().map((p) => p.value));
    const step = raw <= 4 ? 1 : Math.ceil(raw / 4);
    return step * 4;
  });

  protected readonly ticks = computed(() => {
    const m = this.max();
    return [m, (m * 3) / 4, m / 2, m / 4, 0].map((v) => Math.round(v));
  });

  protected height(value: number): number {
    return (value / this.max()) * 100;
  }
}
