import { Component, computed, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** Paginación de tablas: "Mostrando 1–10 de 55" y páginas numeradas. `page` empieza en 0. */
@Component({
  selector: 'tp-pagination',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <span class="range">{{ 'common.showing' | translate: { from: from(), to: to(), total: total() } }}</span>
    @if (pageCount() > 1) {
      <nav [attr.aria-label]="'common.pagination' | translate">
        <button type="button" class="nav" [disabled]="page() === 0" (click)="go(page() - 1)" [attr.aria-label]="'common.previous' | translate">
          <mat-icon>chevron_left</mat-icon>
        </button>
        @for (p of pages(); track $index) {
          @if (p === null) {
            <span class="gap">…</span>
          } @else {
            <button type="button" [class.on]="p === page()" [attr.aria-current]="p === page() ? 'page' : null" (click)="go(p)">
              {{ p + 1 }}
            </button>
          }
        }
        <button
          type="button"
          class="nav"
          [disabled]="page() >= pageCount() - 1"
          (click)="go(page() + 1)"
          [attr.aria-label]="'common.next' | translate"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
      </nav>
    }
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 24px; flex-wrap: wrap;
      border-top: 1px solid var(--tp-border-soft); }
    .range { font-size: 12px; font-weight: 500; color: var(--tp-muted); }
    nav { display: flex; align-items: center; gap: 4px; }
    button { min-width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; cursor: pointer;
      font: 500 13px var(--tp-font-ui); color: var(--tp-muted); display: grid; place-items: center; }
    button:hover:not(:disabled) { background: var(--tp-bg); }
    button.on { background: var(--tp-brand-light); color: var(--tp-cyan-text); font-weight: 700; }
    button:disabled { opacity: 0.4; cursor: default; }
    .nav mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .gap { padding: 0 4px; color: var(--tp-muted); }
  `,
})
export class Pagination {
  readonly total = input.required<number>();
  readonly pageSize = input(10);
  readonly page = model(0);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.total() === 0 ? 0 : this.page() * this.pageSize() + 1));
  protected readonly to = computed(() => Math.min(this.total(), (this.page() + 1) * this.pageSize()));

  /** Primera, última y vecinas de la actual; `null` = salto. */
  protected readonly pages = computed<(number | null)[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    const result: (number | null)[] = [];
    for (let p = 0; p < count; p++) {
      if (p === 0 || p === count - 1 || Math.abs(p - current) <= 1) result.push(p);
      else if (result[result.length - 1] !== null) result.push(null);
    }
    return result;
  });

  protected go(p: number): void {
    this.page.set(Math.min(Math.max(0, p), this.pageCount() - 1));
  }
}
