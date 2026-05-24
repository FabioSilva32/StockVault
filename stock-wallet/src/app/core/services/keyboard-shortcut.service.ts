import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  /** Emits when command palette should open */
  readonly openPalette$ = new Subject<void>();

  private enabled = true;

  constructor(private router: Router, private zone: NgZone) {}

  /** Call once from AppComponent to wire up global listeners */
  init(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.enabled) return;

      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable;

      // Cmd+K / Ctrl+K → command palette (even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.zone.run(() => this.openPalette$.next());
        return;
      }

      // Remaining shortcuts only fire when not in an input
      if (inInput) return;

      switch (e.key) {
        case 'g': case 'G': this.zone.run(() => this.router.navigate(['/market'])); break;
        case 'w': case 'W': this.zone.run(() => this.router.navigate(['/portfolio'])); break;
        case 'c': case 'C': this.zone.run(() => this.router.navigate(['/compare'])); break;
        case 'h': case 'H': this.zone.run(() => this.router.navigate(['/transactions'])); break;
        case 'j': case 'J': this.zone.run(() => this.router.navigate(['/journal'])); break;
        case '/':
          e.preventDefault();
          this.zone.run(() => this.openPalette$.next());
          break;
      }
    });
  }

  /** Temporarily disable shortcuts (e.g. when a modal is open) */
  disable(): void { this.enabled = false; }
  enable(): void  { this.enabled = true;  }
}
