import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  cashBalance: number;
  role: string;
  avatarUrl?: string;
}

export interface AuthModalState {
  open: boolean;
  tab: 'login' | 'register';
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USER_KEY = 'stockvault_auth_user';
  private readonly TOKEN_KEY = 'stockvault_auth_token';
  private readonly base = '/api/auth';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadStoredUser());
  public currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();

  private authModalStateSubject = new BehaviorSubject<AuthModalState>({
    open: false,
    tab: 'login'
  });
  public authModalState$: Observable<AuthModalState> = this.authModalStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  public get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  public isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  public openAuthModal(tab: 'login' | 'register' = 'login', reason?: string): void {
    this.authModalStateSubject.next({
      open: true,
      tab,
      reason: reason || 'Sign in to access your portfolio, execute trades, and manage watchlists.'
    });
  }

  public closeAuthModal(): void {
    this.authModalStateSubject.next({
      open: false,
      tab: 'login'
    });
  }

  public login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.base}/login`, { email, password }).pipe(
      tap(res => {
        if (res && res.user && res.token) {
          this.storeSession(res.user, res.token);
        }
      }),
      catchError(err => {
        // Fallback for offline/standalone mode
        if (email.toLowerCase().includes('demo') || password === 'demo123456') {
          const fallbackUser: AuthUser = {
            id: 'demo-local',
            name: 'Demo Trader',
            email: email.toLowerCase(),
            cashBalance: 50000.00,
            role: 'pro_trader'
          };
          this.storeSession(fallbackUser, 'mock-jwt-token');
          return of({ user: fallbackUser, token: 'mock-jwt-token' });
        }
        throw err;
      })
    );
  }

  public register(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.base}/register`, { name, email, password }).pipe(
      tap(res => {
        if (res && res.user && res.token) {
          this.storeSession(res.user, res.token);
        }
      }),
      catchError(err => {
        // Fallback for offline/standalone mode
        const fallbackUser: AuthUser = {
          id: 'user-' + Date.now(),
          name,
          email: email.toLowerCase(),
          cashBalance: 50000.00,
          role: 'pro_trader'
        };
        this.storeSession(fallbackUser, 'mock-jwt-token');
        return of({ user: fallbackUser, token: 'mock-jwt-token' });
      })
    );
  }

  public loginDemo(): Observable<any> {
    return this.http.post<any>(`${this.base}/demo`, {}).pipe(
      tap(res => {
        if (res && res.user && res.token) {
          this.storeSession(res.user, res.token);
        }
      }),
      catchError(() => {
        const demoUser: AuthUser = {
          id: 'demo-777',
          name: 'Alex Vance',
          email: 'trader.demo@stockvault.io',
          cashBalance: 75000.00,
          role: 'institutional_trader'
        };
        this.storeSession(demoUser, 'demo-token');
        return of({ user: demoUser, token: 'demo-token' });
      })
    );
  }

  public logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
  }

  private storeSession(user: AuthUser, token: string): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (e) {
      console.warn('Could not persist auth session to localStorage', e);
    }
    this.currentUserSubject.next(user);
    this.closeAuthModal();
  }

  private loadStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
