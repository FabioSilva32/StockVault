import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, PriceNotification } from '../../core/services/notification.service';
import { LogoService } from '../../core/services/logo.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: PriceNotification[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private logoService: LogoService
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  dismissNotification(id: string): void {
    this.notificationService.dismiss(id);
  }

  viewStock(ticker: string, id: string): void {
    // Navigate to stock detail page
    this.router.navigate(['/stock', ticker.toUpperCase()]);
    // Close the notification toast immediately
    this.dismissNotification(id);
  }

  getAvatarStyle(ticker: string): { bg: string; color: string; abbreviation: string } {
    const symbol = ticker.toUpperCase();
    let bg = 'linear-gradient(135deg, #6366F1, #4F46E5)'; // Default premium purple-indigo
    let color = '#ffffff';
    let abbreviation = symbol.slice(0, 2);

    switch (symbol) {
      case 'AAPL':
        bg = 'linear-gradient(135deg, #8E9196, #2E2F30)'; // Apple Silver-slate
        abbreviation = 'AP';
        break;
      case 'MSFT':
        bg = 'linear-gradient(135deg, #00A4EF, #005FA3)'; // Microsoft Blue
        abbreviation = 'MS';
        break;
      case 'TSLA':
        bg = 'linear-gradient(135deg, #E82127, #8C0E11)'; // Tesla Red
        abbreviation = 'TS';
        break;
      case 'NVDA':
        bg = 'linear-gradient(135deg, #76B900, #3C6000)'; // Nvidia Green
        abbreviation = 'NV';
        break;
      case 'GOOGL':
      case 'GOOG':
        bg = 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)'; // Google Colors
        abbreviation = 'G';
        break;
      case 'AMZN':
        bg = 'linear-gradient(135deg, #FF9900, #146B93)'; // Amazon Orange-slate
        abbreviation = 'AZ';
        break;
      case 'META':
        bg = 'linear-gradient(135deg, #0066FF, #0033AA)'; // Meta Blue
        abbreviation = 'M';
        break;
      case 'NFLX':
        bg = 'linear-gradient(135deg, #E50914, #141414)'; // Netflix Black-red
        abbreviation = 'NF';
        break;
      case 'JPM':
        bg = 'linear-gradient(135deg, #8A6D3B, #3B2F1F)'; // Chase Gold/Brown
        abbreviation = 'JP';
        break;
      case 'V':
        bg = 'linear-gradient(135deg, #1A1F71, #002244)'; // Visa Deep Blue
        abbreviation = 'V';
        break;
    }

    return { bg, color, abbreviation };
  }
}
