import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private readonly notificationsBaseUrl = 'https://sendnotificationfirebase-production.up.railway.app';
  private readonly notificationsJwtStorageKey = 'mdw-notifications-jwt';

  async request<T = any>(url: string, init?: (RequestInit & { json?: any })): Promise<T> {
    const { json, headers, ...rest } = (init ?? {}) as any;

    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers ?? {})
    };

    const finalInit: RequestInit = {
      ...rest,
      headers: finalHeaders
    };

    if (json !== undefined) {
      finalInit.method = finalInit.method ?? 'POST';
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
   * Optional helper to authenticate against the Railway notifications backend.
   * Stores the JWT in localStorage for subsequent calls.
   */
  async loginNotificationsBackend(email: string, password: string): Promise<string> {
    const res = await this.postJson<any>(`${this.notificationsBaseUrl}/user/login`, {
      email,
      password
    });

    const jwt = String((res as any)?.token ?? (res as any)?.accessToken ?? '');
    if (!jwt) {
      throw new Error('Notifications backend did not return a token.');
    }

    this.storeNotificationsJwt(jwt);
    return jwt;
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
