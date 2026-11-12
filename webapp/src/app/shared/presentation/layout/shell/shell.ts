import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { TopNav } from '../top-nav/top-nav';

const STORAGE_KEY = 'tp.sidebarCollapsed';

@Component({
  selector: 'tp-shell',
  imports: [RouterOutlet, Sidebar, TopNav],
  template: `
    <tp-sidebar class="sidebar" [collapsed]="collapsed()" (toggle)="toggle()" />
    <div class="main">
      <tp-top-nav />
      <main id="content" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: var(--tp-sidebar-expanded) 1fr; height: 100vh; overflow: hidden; transition: grid-template-columns 0.2s ease; }
    :host(.collapsed) { grid-template-columns: var(--tp-sidebar-collapsed) 1fr; }
    .main { display: flex; flex-direction: column; min-width: 0; height: 100vh; }
    main { flex: 1; overflow-y: auto; outline: none; }
    @media (max-width: 900px) { :host, :host(.collapsed) { grid-template-columns: var(--tp-sidebar-collapsed) 1fr; } }
    @media (prefers-reduced-motion: reduce) { :host { transition: none; } }
  `,
  host: { '[class.collapsed]': 'collapsed()' },
})
export class Shell {
  protected readonly collapsed = signal(this.restore());

  protected toggle(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem(STORAGE_KEY, String(this.collapsed()));
    } catch {
      // preferencia solo en memoria
    }
  }

  private restore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
