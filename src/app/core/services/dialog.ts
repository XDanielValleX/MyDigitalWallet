import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

export type DialogConfirmOptions = {
  header?: string;
  message: string;
  okText?: string;
  cancelText?: string;
};

export type DialogAlertOptions = {
  header?: string;
  message: string;
  buttonText?: string;
};

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private alertCtrl: AlertController) { }

  async confirm(options: DialogConfirmOptions): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header: options.header ?? 'Confirm',
      message: options.message,
      buttons: [
        {
          text: options.cancelText ?? 'Cancel',
          role: 'cancel'
        },
        {
          text: options.okText ?? 'OK',
          role: 'confirm'
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'confirm';
  }

  async alert(options: DialogAlertOptions): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: options.header,
      message: options.message,
      buttons: [
        {
          text: options.buttonText ?? 'OK',
          role: 'ok'
        }
      ]
    });

    await alert.present();
    await alert.onDidDismiss();
  }
}
