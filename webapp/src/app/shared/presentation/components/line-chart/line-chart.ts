import { Component, computed, input } from '@angular/core';

export interface LinePoint {
  /** Etiqueta del eje X (por ejemplo "09:50"). */
  label: string;
  value: number;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

/** Gráfico de línea en SVG, sin dependencias, con umbral opcional. */
@Component({
  selector: 'tp-line-chart',
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="ariaLabel()">
      @for (t of ticks(); track t.value) {
        <line class="grid" [attr.x1]="pad.left" [attr.x2]="width - pad.right" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text class="axis" [attr.x]="pad.left - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.value }} {{ unit() }}</text>
      }
      @if (thresholdY(); as ty) {
        <line class="threshold" [attr.x1]="pad.left" [attr.x2]="width - pad.right" [attr.y1]="ty" [attr.y2]="ty" />
        <text class="threshold-label" [attr.x]="pad.left + 4" [attr.y]="ty - 6">{{ thresholdLabel() }}</text>
      }
      <polyline class="line" [attr.points]="polyline()" />
      @for (p of plotted(); track $index) {
        <circle class="dot" [class.dot--alert]="p.alert" [attr.cx]="p.x" [attr.cy]="p.y" r="3.5">
          <title>{{ p.label }} · {{ p.value }} {{ unit() }}</title>
        </circle>
        @if (p.showLabel) {
          <text class="axis" [attr.x]="p.x" [attr.y]="height - 8" text-anchor="middle">{{ p.label }}</text>
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: auto; max-height: 280px; overflow: visible; }
    .grid { stroke: var(--tp-border-soft); stroke-width: 1; }
    .axis { font: 500 11px var(--tp-font-ui); fill: var(--tp-muted); }
    .line { fill: none; stroke: var(--tp-cyan); stroke-width: 2.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .dot { fill: var(--tp-white); stroke: var(--tp-cyan); stroke-width: 2; }
    .dot--alert { stroke: var(--tp-warning); }
    .threshold { stroke: var(--tp-warning); stroke-width: 1.5; stroke-dasharray: 6 4; }
    .threshold-label { font: 600 11px var(--tp-font-ui); fill: var(--tp-warning-text); }
  `,
})
export class LineChart {
  readonly points = input.required<LinePoint[]>();
  readonly unit = input('');
  readonly min = input<number>();
  readonly max = input<number>();
  readonly threshold = input<number>();
  readonly thresholdLabel = input('');
  readonly ariaLabel = input('');
  /** Marca en alerta los puntos por debajo del umbral. */
  readonly alertBelowThreshold = input(true);

  protected readonly width = W;
  protected readonly height = H;
  protected readonly pad = PAD;

  private readonly range = computed(() => {
    const values = this.points().map((p) => p.value);
    const t = this.threshold();
    if (t !== undefined) values.push(t);
    const lo = this.min() ?? Math.floor(Math.min(...values, 0) / 10) * 10;
    const hi = this.max() ?? Math.ceil(Math.max(...values, 1) / 10) * 10;
    return { lo, hi: hi === lo ? lo + 10 : hi };
  });

  private y(value: number): number {
    const { lo, hi } = this.range();
    return PAD.top + ((hi - value) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  }

  protected readonly ticks = computed(() => {
    const { lo, hi } = this.range();
    const step = (hi - lo) / 4;
    return Array.from({ length: 5 }, (_, i) => {
      const value = Math.round(hi - i * step);
      return { value, y: this.y(value) };
    });
  });

  protected readonly plotted = computed(() => {
    const pts = this.points();
    const span = W - PAD.left - PAD.right;
    const every = Math.max(1, Math.ceil(pts.length / 8));
    const t = this.threshold();
    return pts.map((p, i) => ({
      ...p,
      x: PAD.left + (pts.length === 1 ? span / 2 : (i / (pts.length - 1)) * span),
      y: this.y(p.value),
      alert: this.alertBelowThreshold() && t !== undefined && p.value < t,
      showLabel: i % every === 0 || i === pts.length - 1,
    }));
  });

  protected readonly polyline = computed(() => this.plotted().map((p) => `${p.x},${p.y}`).join(' '));
  protected readonly thresholdY = computed(() => {
    const t = this.threshold();
    return t === undefined ? null : this.y(t);
  });
}
