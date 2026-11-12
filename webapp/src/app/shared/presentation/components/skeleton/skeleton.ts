import { Component, computed, input } from '@angular/core';

/** Placeholder animado mientras cargan los datos (nunca pantallas en blanco). */
@Component({
  selector: 'tp-skeleton',
  template: `
    @switch (variant()) {
      @case ('cards') {
        <div class="cards">
          @for (i of items(); track i) {
            <div class="tp-card card"><span class="bar w40"></span><span class="bar h32 w60"></span><span class="bar w80"></span></div>
          }
        </div>
      }
      @case ('table') {
        <div class="tp-card table">
          <span class="bar h20 w30"></span>
          @for (i of items(); track i) {
            <div class="row"><span class="bar w20"></span><span class="bar w30"></span><span class="bar w20"></span><span class="bar w15"></span></div>
          }
        </div>
      }
      @default {
        <div class="tp-card block">
          @for (i of items(); track i) {
            <span class="bar" [style.width.%]="90 - (i % 3) * 20"></span>
          }
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
    .card, .block, .table { display: flex; flex-direction: column; gap: 12px; }
    .row { display: flex; gap: 24px; padding: 12px 0; border-top: 1px solid var(--tp-border-soft); }
    .bar { display: block; height: 14px; border-radius: 6px;
      background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%); background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite; }
    .h20 { height: 20px; } .h32 { height: 32px; }
    .w15 { width: 15%; } .w20 { width: 20%; } .w30 { width: 30%; } .w40 { width: 40%; } .w60 { width: 60%; } .w80 { width: 80%; }
    @keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  `,
  host: { 'aria-busy': 'true', role: 'status' },
})
export class Skeleton {
  readonly variant = input<'block' | 'cards' | 'table'>('block');
  readonly count = input(4);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
