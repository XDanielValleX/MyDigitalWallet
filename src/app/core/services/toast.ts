import { Injectable } from '@angular/core';
import { ToastController, ToastOptions } from '@ionic/angular';

export type ToastPosition = NonNullable<ToastOptions['position']>;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private active?: HTMLIonToastElement;

  constructor(private toastCtrl: ToastController) { }

  async show(message: string, options?: Partial<ToastOptions>): Promise<void> {
    // Avoid toast stacking; keep last one only.
    try {
      await this.active?.dismiss();
    } catch {
      // ignore
    }

    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'dark',
      position: 'top',
      ...options
    });

    this.active = toast;
    await toast.present();

    void toast.onDidDismiss().then(() => {
      if (this.active === toast) {
        this.active = undefined;
      }
    });
  }

  success(message: string, options?: Partial<ToastOptions>) {
    return this.show(message, { color: 'success', ...options });
  }

  error(message: string, options?: Partial<ToastOptions>) {
    return this.show(message, { color: 'danger', ...options });
  }
}
