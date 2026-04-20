import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';

export type OpenModalOptions = {
  componentProps?: Record<string, any>;
  cssClass?: string | string[];
  backdropDismiss?: boolean;
  showBackdrop?: boolean;
  breakpoints?: number[];
  initialBreakpoint?: number;
  handle?: boolean;
  canDismiss?: boolean | ((data?: any, role?: string) => Promise<boolean>);
  expandToScroll?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  constructor(private modalCtrl: ModalController) { }

  async open(component: any, options?: OpenModalOptions): Promise<HTMLIonModalElement> {
    const modal = await this.modalCtrl.create({
      component,
      ...options
    });
    await modal.present();
    return modal;
  }

  async openAndWait(component: any, options?: OpenModalOptions): Promise<{ data: any; role: string }>
  {
    const modal = await this.modalCtrl.create({
      component,
      ...options
    });

    await modal.present();
    const result = await modal.onDidDismiss();
    return { data: result.data, role: result.role ?? 'dismiss' };
  }

  dismiss(data?: any, role?: string, id?: string) {
    return this.modalCtrl.dismiss(data, role, id);
  }
}
