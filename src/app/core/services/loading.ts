import { Injectable } from '@angular/core';
import { LoadingController, LoadingOptions } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private active?: HTMLIonLoadingElement;
  private counter = 0;

  constructor(private loadingCtrl: LoadingController) { }

  async show(options?: Partial<LoadingOptions> | string): Promise<void> {
    this.counter += 1;

    if (this.active) {
      if (typeof options === 'string') {
        this.active.message = options;
      }
      return;
    }

    const opts: Partial<LoadingOptions> =
      typeof options === 'string'
        ? { message: options }
        : (options ?? {});

    const loading = await this.loadingCtrl.create({
      spinner: 'crescent',
      ...opts
    });

    this.active = loading;
    await loading.present();

    void loading.onDidDismiss().then(() => {
      if (this.active === loading) {
        this.active = undefined;
      }
      this.counter = 0;
    });
  }

  async hide(): Promise<void> {
    this.counter = Math.max(0, this.counter - 1);
    if (this.counter > 0) {
      return;
    }

    const loading = this.active;
    this.active = undefined;

    try {
      await loading?.dismiss();
    } catch {
      // ignore
    }
  }
}
