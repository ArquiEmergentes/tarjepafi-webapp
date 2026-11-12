import { Component, input } from '@angular/core';

@Component({
  selector: 'tp-page-header',
  template: `
    <div class="text">
      <ng-content select="[breadcrumb]" />
      <h1>{{ title() }}</h1>
      @if (subtitle()) {
        <p class="tp-muted">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    p { margin: 0; font-size: 14px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
