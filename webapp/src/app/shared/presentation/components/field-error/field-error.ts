import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Error de validación bajo un campo: rojo, 4 px debajo y con icono (Design System). */
@Component({
  selector: 'tp-field-error',
  imports: [MatIconModule],
  template: `
    @if (message()) {
      <p role="alert"><mat-icon>error</mat-icon>{{ message() }}</p>
    }
  `,
  styles: `
    p { display: flex; align-items: center; gap: 4px; margin: 4px 0 0; color: var(--tp-error); font-size: 12px; font-weight: 500; }
    mat-icon { font-size: 16px; width: 16px; height: 16px; flex: none; }
  `,
})
export class FieldError {
  readonly message = input<string | null>(null);
}
