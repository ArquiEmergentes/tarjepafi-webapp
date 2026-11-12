import { Component, input } from '@angular/core';

@Component({
  selector: 'tp-brand-logo',
  template: `
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect x="2" y="4" width="22" height="24" rx="6" [attr.fill]="inverse() ? '#ffffff' : '#0A2540'" />
        <path d="M9 22V10h5.2a4 4 0 0 1 0 8H12" fill="none" [attr.stroke]="inverse() ? '#0A2540' : '#ffffff'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M27 6.5a6 6 0 0 1 0 7" fill="none" stroke="#0284C7" stroke-width="2.2" stroke-linecap="round" />
      </svg>
    </span>
    @if (!compact()) {
      <span class="word" [class.word--inverse]="inverse()">Tarje<strong>PAFI</strong></span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 8px; }
    .mark { display: inline-flex; }
    .word { font-family: var(--tp-font-title); font-size: 20px; font-weight: 600; color: var(--tp-text); letter-spacing: -0.01em; }
    .word strong { color: var(--tp-cyan); font-weight: 700; }
    .word--inverse { color: #ffffff; }
    .word--inverse strong { color: #38bdf8; }
  `,
})
export class BrandLogo {
  readonly inverse = input(false);
  readonly compact = input(false);
}
