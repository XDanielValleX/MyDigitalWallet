import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { BehaviorSubject } from 'rxjs';
import { FirestoreService } from './firestore';

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
  pushEnabled?: boolean;
  pushToken?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  data?: Record<string, any>;
  seen: boolean;
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

  private readonly inboxStorageKey = 'mdw-notifications-inbox-v1';
  private readonly inboxMaxItems = 25;
  private readonly inboxSubject = new BehaviorSubject<InboxNotification[]>(this.readStoredInbox());
  readonly inbox$ = this.inboxSubject.asObservable();
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private readonly paymentNotificationChannelId = 'mdw-payment-confirmations';
  private paymentNotificationChannelReady = false;

  constructor(
    private firestore: FirestoreService
  ) {
    this.initTheme();
    this.initBalanceVisibility();

    this.unreadCountSubject.next(this.computeUnreadCount(this.inboxSubject.value));

    if (Capacitor.isNativePlatform()) {
      // Best-effort: create channel early so both push + local notifications have a high-importance channel.
      void this.ensurePaymentNotificationChannel();
    }
  }

  markAllInboxSeen(): void {
    const current = this.inboxSubject.value;
    if (!current.some(n => !n.seen)) {
      return;
    }

    const next = current.map(n => ({ ...n, seen: true }));
    this.inboxSubject.next(next);
    this.unreadCountSubject.next(0);
    this.persistInbox(next);
  }

  private addInboxNotification(input: { title: string; body: string; data?: Record<string, any> }): void {
    const title = String(input.title ?? '').trim() || 'MyDigitalWallet';
    const body = String(input.body ?? '').trim();
    if (!body) {
      return;
    }

    const item: InboxNotification = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      title,
      body,
      receivedAt: new Date().toISOString(),
      data: input.data ?? undefined,
      seen: false,
    };

    const next = [item, ...this.inboxSubject.value].slice(0, this.inboxMaxItems);
    this.inboxSubject.next(next);
    this.unreadCountSubject.next(this.computeUnreadCount(next));
    this.persistInbox(next);
  }

  private computeUnreadCount(items: InboxNotification[]): number {
    let count = 0;
    for (const n of items) {
      if (!n.seen) count++;
    }
    return count;
  }

  private readStoredInbox(): InboxNotification[] {
    try {
      const raw = localStorage.getItem(this.inboxStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((x: any) => ({
          id: String(x?.id ?? ''),
          title: String(x?.title ?? ''),
          body: String(x?.body ?? ''),
          receivedAt: String(x?.receivedAt ?? ''),
          data: (x?.data && typeof x.data === 'object') ? x.data : undefined,
          seen: Boolean(x?.seen),
        }))
        .filter((x: InboxNotification) => Boolean(x.id && x.body));
    } catch {
      return [];
    }
  }

  private persistInbox(items: InboxNotification[]): void {
    try {
      localStorage.setItem(this.inboxStorageKey, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  private async ensurePaymentNotificationChannel(): Promise<boolean> {
    if (this.paymentNotificationChannelReady) {
      return true;
    }

    try {
      await LocalNotifications.createChannel({
        id: this.paymentNotificationChannelId,
        name: 'MyDigitalWallet Payments',
        description: 'Payment confirmations and account updates',
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      this.paymentNotificationChannelReady = true;
      return true;
    } catch (error) {
      console.warn('Unable to create notifications channel:', error);
      return false;
    }
  }

  private async showForegroundPushAsSystemNotification(payload: any): Promise<void> {
    const title = String(payload?.title ?? '').trim() || 'MyDigitalWallet';
    const body = String(payload?.body ?? '').trim();
    if (!body) {
      return;
    }

    // Keep an in-app inbox for the Home "bell" button.
    this.addInboxNotification({ title, body, data: payload?.data ?? undefined });

    const channelOk = await this.ensurePaymentNotificationChannel();
    if (!channelOk) {
      return;
    }

    // Don't prompt here; permissions should be requested from a user action (Profile toggle).
    const perm = await LocalNotifications.checkPermissions().catch(() => ({ display: 'prompt' } as any));
    if (perm.display !== 'granted') {
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483647),
            title,
            body,
            channelId: this.paymentNotificationChannelId,
            autoCancel: true,
            extra: payload?.data ?? undefined,
          },
        ],
      });
    } catch (error) {
      console.warn('Unable to show foreground system notification:', error);
    }
  }

  /**
   * Returns whether the app has OS-level permission to post notifications.
   * Used for UI warnings (e.g., Home bell yellow alert).
   */
  async isNotificationsPermissionGranted(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // On web there is no Capacitor notifications permission flow.
      return true;
    }

    const [pushPerm, localPerm] = await Promise.all([
      PushNotifications.checkPermissions().catch(() => ({ receive: 'prompt' } as any)),
      LocalNotifications.checkPermissions().catch(() => ({ display: 'prompt' } as any)),
    ]);

    const pushGranted = String((pushPerm as any)?.receive ?? '') === 'granted';
    const localGranted = String((localPerm as any)?.display ?? '') === 'granted';
    return pushGranted || localGranted;
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

    // Foreground delivery: Android won't show the push in the notification shade while
    // the app is open, so we mirror it as a local system notification.
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      void this.showForegroundPushAsSystemNotification(n as any);
    }).catch(() => { });

    // When the user taps a notification.
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const n = (action as any)?.notification ?? null;
      const title = String(n?.title ?? '').trim() || 'MyDigitalWallet';
      const body = String(n?.body ?? '').trim();
      if (body) {
        this.addInboxNotification({ title, body, data: n?.data ?? undefined });
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
