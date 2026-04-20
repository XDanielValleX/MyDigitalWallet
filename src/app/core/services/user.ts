import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirestoreService } from './firestore';
import { NotificationService } from './notification';

export type ThemeMode = 'system' | 'light' | 'dark';

export type UserProfile = {
  id?: string;
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  docType?: string;
  docNumber?: string;
  country?: string;
  defaultCardId?: string | null;
  biometricsEnabled?: boolean;
  pushToken?: string;
  createdAt?: any;
  updatedAt?: any;
};

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly themeStorageKey = 'mdw-theme-mode';
  private readonly balanceVisibilityStorageKey = 'mdw-balance-visible';
  private themeMode: ThemeMode = 'system';
  private balanceVisible = true;
  private mql?: MediaQueryList;
  private readonly paletteDarkClass = 'ion-palette-dark';
  private readonly legacyDarkClass = 'dark';

  private pushToken: string | null = null;
  private pushTokenPromise: Promise<string | null> | null = null;
  private pushListenersReady = false;

  constructor(
    private firestore: FirestoreService,
    private notify: NotificationService
  ) {
    this.initTheme();
    this.initBalanceVisibility();
  }

  getMode(): ThemeMode {
    return this.themeMode;
  }

  getEffectiveIsDark(): boolean {
    if (this.themeMode === 'dark') return true;
    if (this.themeMode === 'light') return false;
    return Boolean(this.mql?.matches);
  }

  setMode(mode: ThemeMode) {
    this.themeMode = mode;
    try {
      localStorage.setItem(this.themeStorageKey, mode);
    } catch {
      // ignore storage failures
    }
    this.applyMode(mode);
  }

  /** Convenience for toggle UIs */
  setDarkEnabled(enabled: boolean) {
    this.setMode(enabled ? 'dark' : 'light');
  }

  getBalanceVisible(): boolean {
    return this.balanceVisible;
  }

  setBalanceVisible(visible: boolean) {
    this.balanceVisible = visible;
    try {
      localStorage.setItem(this.balanceVisibilityStorageKey, visible ? '1' : '0');
    } catch {
      // ignore storage failures
    }
  }

  getProfile(uid: string) {
    return this.firestore.getDoc<UserProfile>(`users/${uid}`);
  }

  updateProfile(uid: string, patch: Partial<UserProfile>) {
    return this.firestore.setDoc(
      `users/${uid}`,
      {
        ...patch,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  setDefaultCardId(uid: string, cardId: string | null) {
    return this.updateProfile(uid, { defaultCardId: cardId });
  }

  /**
   * Ensures we have a native push token (FCM/APNS) for the current device.
   * - Returns `null` on web (non-native) or if permission is denied.
   * - Caches the token in-memory to avoid re-registering.
   */
  async ensurePushToken(uid?: string): Promise<string | null> {
    if (this.pushToken) {
      return this.pushToken;
    }

    if (this.pushTokenPromise) {
      return this.pushTokenPromise;
    }

    this.pushTokenPromise = this.registerForPushToken(uid).finally(() => {
      this.pushTokenPromise = null;
    });

    return this.pushTokenPromise;
  }

  private async registerForPushToken(uid?: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    this.ensurePushListeners();

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt') {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== 'granted') {
        return null;
      }

      const token = await new Promise<string>(async (resolve, reject) => {
        let finished = false;

        const finish = async (value: string | null, error?: any) => {
          if (finished) {
            return;
          }
          finished = true;

          try {
            await regHandle.remove();
            await errHandle.remove();
          } catch {
            // ignore
          }

          if (value) {
            resolve(value);
          } else {
            reject(error ?? new Error('Push registration failed'));
          }
        };

        const regHandle = await PushNotifications.addListener('registration', (t) => {
          void finish(String((t as any)?.value ?? ''), undefined);
        });

        const errHandle = await PushNotifications.addListener('registrationError', (e) => {
          void finish(null, e);
        });

        PushNotifications.register().catch(err => finish(null, err));
      });

      this.pushToken = token;

      if (uid) {
        // Best-effort: store token in user profile for backend usage.
        await this.updateProfile(uid, { pushToken: token } as any).catch(() => { });
      }

      return token;
    } catch (err) {
      console.warn('Push token registration failed:', err);
      return null;
    }
  }

  private ensurePushListeners() {
    if (this.pushListenersReady) {
      return;
    }
    this.pushListenersReady = true;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Foreground delivery: show a lightweight toast so the user sees something.
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      const title = String((n as any)?.title ?? '').trim();
      const body = String((n as any)?.body ?? '').trim();
      const message = [title, body].filter(Boolean).join(' — ');
      if (message) {
        void this.notify.info(message);
      }
    }).catch(() => { });

    // When the user taps a notification.
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const n = (action as any)?.notification ?? null;
      const title = String(n?.title ?? '').trim();
      const body = String(n?.body ?? '').trim();
      const message = [title, body].filter(Boolean).join(' — ');
      if (message) {
        void this.notify.info(message);
      }
    }).catch(() => { });
  }

  private initTheme() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const matchMedia = window.matchMedia?.bind(window);
    this.mql = matchMedia ? matchMedia('(prefers-color-scheme: dark)') : undefined;

    this.themeMode = this.readStoredMode();
    this.applyMode(this.themeMode);

    const handler = () => {
      if (this.themeMode === 'system') {
        this.applyMode('system');
      }
    };

    try {
      this.mql?.addEventListener?.('change', handler);
      // Safari legacy
      (this.mql as any)?.addListener?.(handler);
    } catch {
      // ignore
    }
  }

  private readStoredMode(): ThemeMode {
    try {
      const raw = localStorage.getItem(this.themeStorageKey);
      if (raw === 'dark' || raw === 'light' || raw === 'system') {
        return raw;
      }
    } catch {
      // ignore
    }
    return 'system';
  }

  private initBalanceVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = localStorage.getItem(this.balanceVisibilityStorageKey);
      if (raw === '1' || raw === 'true') {
        this.balanceVisible = true;
        return;
      }
      if (raw === '0' || raw === 'false') {
        this.balanceVisible = false;
        return;
      }
    } catch {
      // ignore
    }

    this.balanceVisible = true;
  }

  private applyMode(mode: ThemeMode) {
    if (typeof document === 'undefined') {
      return;
    }

    const isDark = mode === 'dark' || (mode === 'system' && Boolean(this.mql?.matches));
    const targets = [document.documentElement, document.body];
    for (const el of targets) {
      el?.classList.toggle(this.paletteDarkClass, isDark);
      el?.classList.toggle(this.legacyDarkClass, isDark);
    }
  }
}
