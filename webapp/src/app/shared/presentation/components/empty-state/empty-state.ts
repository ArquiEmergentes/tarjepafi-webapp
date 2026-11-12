import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Estado vacío o de error: explica qué pasó y qué hacer. Las acciones van por ng-content. */
@Component({
  selector: 'tp-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty" [class.empty--error]="tone() === 'error'">
      <span class="icon"><mat-icon>{{ icon() }}</mat-icon></span>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 48px 24px; }
    .icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
      background: var(--tp-brand-light); color: var(--tp-cyan-text); margin-bottom: 8px; }
    .empty--error .icon { background: var(--tp-error-bg); color: var(--tp-error); }
    .icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    h3 { font-size: 16px; }
    p { margin: 0; color: var(--tp-muted); max-width: 440px; }
    .actions:not(:empty) { margin-top: 16px; display: flex; gap: 8px; }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly tone = input<'neutral' | 'error'>('neutral');
}
