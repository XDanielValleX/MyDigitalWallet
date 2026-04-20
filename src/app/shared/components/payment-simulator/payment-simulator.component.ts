import { Component, Input } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { faker } from '@faker-js/faker';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NativeBiometric } from 'capacitor-native-biometric';
import type { Subscription } from 'rxjs';
import { PaymentService } from '../../../core/services/payment';
import { NotificationService } from '../../../core/services/notification';
import { UserService } from '../../../core/services/user';
import { HttpService } from '../../../core/services/http';
import { arrowBackOutline } from 'ionicons/icons';

export type PaymentSimulationType = 'expense' | 'income';

export type PaymentSimulationResult = {
  title: string;
  amount: number;
  type: PaymentSimulationType;
  nextBalance: number;
  transactionId?: string;
};

type PaymentStep = 'confirm' | 'processing' | 'success';
export type PaymentSimulatorVariant = 'full' | 'status';

@Component({
  selector: 'app-payment-simulator',
  templateUrl: './payment-simulator.component.html',
  styleUrls: ['./payment-simulator.component.scss'],
  host: { class: 'ion-page' },
  standalone: false
})
export class PaymentSimulatorComponent {
  @Input() startingBalance = 0;
  @Input() uid: string | null = null;
  @Input() cardId: string | null = null;
  @Input() card: any | null = null;
  @Input() biometricsEnabled = false;

  @Input() variant: PaymentSimulatorVariant = 'full';
  @Input() autoStart = false;

  @Input() merchant = '';
  @Input() amount = 0;

  step: PaymentStep = 'confirm';

  readonly backIcon = arrowBackOutline;

  private isBusy = false;
  private transactionId: string | null = null;

  private backButtonSub: Subscription | null = null;

  constructor(
    private platform: Platform,
    private modalCtrl: ModalController,
    private payments: PaymentService,
    private notify: NotificationService,
    private users: UserService,
    private http: HttpService
  ) { }

  ionViewDidEnter() {
    this.backButtonSub?.unsubscribe();
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(10000, () => {
      void this.onHardwareBack();
    });
  }

  ionViewWillLeave() {
    this.backButtonSub?.unsubscribe();
    this.backButtonSub = null;
  }

  private async onHardwareBack() {
    // While processing, do nothing.
    if (!this.canDismiss) {
      return;
    }

    // In status-only mode, after success the only exit should behave like DONE.
    if (this.isStatusOnly && this.step === 'success') {
      await this.done();
      return;
    }

    // Otherwise, default behavior.
    await this.back();
  }

  ionViewWillEnter() {
  this.transactionId = null;

  if (this.variant === 'full') {
    this.resetSimulation();
    return;
  }

  // Status-only modal: processing + success.
  this.step = 'processing';
  if (!this.merchant || !Number.isFinite(this.amount) || this.amount <= 0) {
    this.generateMerchantAndAmount();
  }

  if (this.autoStart) {
    void this.confirmPayment();
  }
  }

  private get isStatusOnly(): boolean {
    return this.variant === 'status';
  }

  get amountLabel(): string {
    // Keep in sync with templates using currency pipe.
    return `$${this.amount.toFixed(2)}`;
  }

  get canDismiss(): boolean {
    return !this.isBusy;
  }

  get nextBalance(): number {
    return Number(this.startingBalance || 0) - Number(this.amount || 0);
  }

  async back() {
    if (!this.canDismiss) {
      return;
    }

    if (this.step === 'success') {
      await this.done();
      return;
    }

    await this.cancel();
  }

  async cancel() {
    if (!this.canDismiss) {
      return;
    }
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async done() {
    const result: PaymentSimulationResult = {
      title: this.merchant,
      amount: this.amount,
      type: 'expense',
      nextBalance: this.nextBalance,
      transactionId: this.transactionId ?? undefined
    };

    await this.modalCtrl.dismiss(result, 'done');
  }

  async confirmPayment() {
    if (this.isBusy) {
      return;
    }

	if (this.isStatusOnly) {
		this.step = 'processing';
	}

    if (!this.uid || !this.cardId) {
      await this.notify.error('No card selected.');
		if (this.isStatusOnly) {
			await this.modalCtrl.dismiss(null, 'cancel');
		}
      return;
    }

    this.isBusy = true;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });

      const verified = await this.verifyIdentityIfNeeded();
      if (!verified) {
		if (this.isStatusOnly) {
			await this.modalCtrl.dismiss(null, 'cancel');
		}
        return;
      }

      this.step = 'processing';
      const startedAt = Date.now();
      const createdAt = new Date().toISOString();

      this.transactionId = await this.payments.process(this.uid, this.cardId, {
        title: this.merchant,
        amount: this.amount,
        type: 'expense',
        icon: 'business-outline',
        createdAt
      });

      await this.sendPushConfirmation(this.uid).catch(err => {
        console.warn('Push notification failed:', err);
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) {
        await new Promise(res => setTimeout(res, 900 - elapsed));
      }

      this.step = 'success';
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.error(e);
	  await this.notify.error('Payment failed.');
	  if (this.isStatusOnly) {
		await this.modalCtrl.dismiss(null, 'cancel');
		return;
	  }
	  this.step = 'confirm';
    } finally {
      this.isBusy = false;
    }
  }

  private generateMerchantAndAmount() {
    // faker: realistic merchant + amount
    const suffixes = ['Group', 'LLC', 'and Sons', 'Inc'];
    const base = faker.company.name();
    const suffix = suffixes[faker.number.int({ min: 0, max: suffixes.length - 1 })];
    this.merchant = `${base} ${suffix}`.replace(/\s+/g, ' ').trim();

    // Avoid tiny amounts; generate two decimals.
    const val = faker.number.float({ min: 5, max: 500, fractionDigits: 2 });
    this.amount = Number.isFinite(val) ? val : 0;
  }

  private resetSimulation() {
    this.step = 'confirm';
    this.transactionId = null;
	this.generateMerchantAndAmount();
  }

  private async verifyIdentityIfNeeded(): Promise<boolean> {
    if (!this.biometricsEnabled) {
      return true;
    }

    const available = await NativeBiometric.isAvailable({ useFallback: true }).catch(() => ({ isAvailable: false } as any));
    if (!available?.isAvailable) {
      await this.notify.error('Biometrics not available on this device.');
      return false;
    }

    const ok = await NativeBiometric.verifyIdentity({
      reason: 'Confirm this payment',
      title: 'Confirm Payment',
      subtitle: 'Secure NFC Transaction',
      description: 'Verify your identity to authorize this payment.',
      negativeButtonText: 'Cancel',
      useFallback: true
    })
      .then(() => true)
      .catch(() => false);

    if (!ok) {
      await this.notify.info('Payment cancelled.');
      return false;
    }

    return true;
  }

  private async sendPushConfirmation(uid: string): Promise<void> {
    const token = await this.users.ensurePushToken(uid);
    if (!token) {
      await this.notify.info('No se pudo obtener el token de notificaciones (permiso denegado o no disponible).');
      return;
    }

    let sent = false;
    try {
      sent = await this.http.sendPushNotificationIfConfigured({
        token,
        title: 'Payment Successful',
        body: `You have successfully paid an amount of ${this.amountLabel}.`,
        data: {
          merchant: this.merchant,
          amount: String(this.amount)
        }
      });
    } catch (err) {
      console.warn('Push notification failed:', err);
      await this.notify.error('No se pudo enviar la notificación push.');
      return;
    }

    if (!sent) {
      await this.notify.info('Push no configurado: inicia sesión en el servicio de Railway (ver README) para poder enviarlas.');
    }
  }
}
