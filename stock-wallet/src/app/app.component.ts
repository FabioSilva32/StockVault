import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './core/navbar/navbar.component';
import { NotificationsComponent } from './core/notifications/notifications.component';
import { AiCopilotComponent } from './shared/ai-copilot/ai-copilot.component';
import { CommandPaletteComponent } from './shared/command-palette/command-palette.component';
import { KeyboardShortcutService } from './core/services/keyboard-shortcut.service';

import { TickerTapeComponent } from './core/ticker-tape/ticker-tape.component';
import { AuthModalComponent } from './shared/auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, NotificationsComponent, AiCopilotComponent, CommandPaletteComponent, TickerTapeComponent, AuthModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'stock-wallet';
  showBackToTop = false;

  constructor(private shortcuts: KeyboardShortcutService) {}

  ngOnInit(): void {
    this.shortcuts.init();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.showBackToTop = window.scrollY > 320;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
