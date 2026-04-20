import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private readonly notificationsBaseUrl = 'https://sendnotificationfirebase-production.up.railway.app';
  private readonly notificationsJwtStorageKey = 'mdw-notifications-jwt';

  private static decodeJwtPayload(jwt: string): any | null {
    try {
      const token = String(jwt ?? '').trim().replace(/^bearer\s+/i, '');
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

      // `atob` is available in browsers/WebView.
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  async request<T = any>(url: string, init?: (RequestInit & { json?: any })): Promise<T> {
    const { json, headers, ...rest } = (init ?? {}) as any;

    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers ?? {})
    };

    const method = String((rest as any)?.method ?? (json !== undefined ? 'POST' : 'GET')).toUpperCase();

    // On Android/iOS, prefer native HTTP to avoid CORS issues.
    if (Capacitor.isNativePlatform()) {
      const nativeHeaders: Record<string, string> = { ...finalHeaders };
      if (json !== undefined) {
        nativeHeaders['Content-Type'] = nativeHeaders['Content-Type'] ?? 'application/json';
      }

      const res = await CapacitorHttp.request({
        url,
        method,
        headers: nativeHeaders,
        data: json !== undefined ? json : undefined,
      });

      if (res.status < 200 || res.status >= 300) {
        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const data = (res as any)?.data;
      if (data === undefined || data === null || data === '') {
        return undefined as any;
      }

      // CapacitorHttp may return parsed JSON already.
      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as any;
        }
      }

      return data as T;
    }

    // Web fallback.
    const finalInit: RequestInit = {
      ...rest,
      method,
      headers: finalHeaders
    };

    if (json !== undefined) {
      (finalInit.headers as any)['Content-Type'] = 'application/json';
      finalInit.body = JSON.stringify(json);
    }

    const res = await fetch(url, finalInit);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }

    if (!text) {
      return undefined as any;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // Not JSON, return raw text.
      return text as any;
    }
  }

  getJson<T = any>(url: string, init?: RequestInit) {
    return this.request<T>(url, { ...(init ?? {}), method: 'GET' });
  }

  postJson<T = any>(url: string, body: any, init?: RequestInit) {
    return this.request<T>(url, { ...(init ?? {}), method: 'POST', json: body });
  }

  getStoredNotificationsJwt(): string | null {
    try {
      const raw = localStorage.getItem(this.notificationsJwtStorageKey);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  getStoredNotificationsJwtEmail(): string | null {
    const jwt = this.getStoredNotificationsJwt();
    if (!jwt) {
      return null;
    }

    const payload = HttpService.decodeJwtPayload(jwt);
    const email = String(payload?.email ?? '').trim();
    return email || null;
  }

  storeNotificationsJwt(jwt: string) {
    try {
      localStorage.setItem(this.notificationsJwtStorageKey, String(jwt));
    } catch {
      // ignore
    }
  }

  clearStoredNotificationsJwt() {
    try {
      localStorage.removeItem(this.notificationsJwtStorageKey);
    } catch {
      // ignore
    }
  }

  /**
   * Returns whether the current NotifyPro user has Firebase Admin credentials uploaded.
   * - `true`  => configured
   * - `false` => missing
   * - `null`  => not logged in (no JWT)
   */
  async getNotificationsCredentialsStatus(): Promise<boolean | null> {
    const jwt = this.getStoredNotificationsJwt();
    if (!jwt) {
      return null;
    }

    const res = await this.getJson<any>(`${this.notificationsBaseUrl}/credentials/status`, {
      headers: {
        Authorization: jwt
      }
    });

    return Boolean((res as any)?.data);
  }

  /**
   * Optional helper to authenticate against the Railway notifications backend.
   * Stores the JWT in localStorage for subsequent calls.
   */
  async loginNotificationsBackend(email: string, password: string): Promise<string> {
    const res = await this.postJson<any>(`${this.notificationsBaseUrl}/user/login`, {
      email,
      password
    });

    const rawToken =
      (res as any)?.token ??
      (res as any)?.access_token ??
      (res as any)?.accessToken ??
      (res as any)?.jwt ??
      (res as any)?.data?.token ??
      (res as any)?.data?.access_token ??
      (res as any)?.data?.accessToken ??
      '';

    const jwt = String(rawToken ?? '').trim();
    if (!jwt) {
      throw new Error('Notifications backend did not return a token.');
    }

    // Backend UI stores tokens as "Bearer <jwt>". Normalize to that format for Authorization header.
    const normalizedJwt = /^bearer\s+/i.test(jwt)
      ? jwt
      : (jwt.split('.').length === 3 ? `Bearer ${jwt}` : jwt);

    this.storeNotificationsJwt(normalizedJwt);
    return normalizedJwt;
  }

  /**
   * Sends a native push notification via the Railway backend if a JWT is configured.
   * Returns true when sent, false when not configured.
   */
  async sendPushNotificationIfConfigured(options: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<boolean> {
    const jwt = this.getStoredNotificationsJwt();
    if (!jwt) {
      return false;
    }

    await this.postJson(
      `${this.notificationsBaseUrl}/notifications/`,
      {
        token: options.token,
        notification: {
          title: options.title,
          body: options.body
        },
        android: {
          priority: 'high',
          data: options.data ?? {}
        }
      },
      {
        headers: {
          Authorization: jwt
        }
      }
    );

    return true;
  }
}
