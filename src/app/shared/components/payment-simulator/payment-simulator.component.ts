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
  @Input() pushEnabled = true;

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

      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) {
        await new Promise(res => setTimeout(res, 900 - elapsed));
      }

      this.step = 'success';
      await Haptics.impact({ style: ImpactStyle.Light });

      // NotifyPro confirmation should happen AFTER the payment is fully processed.
      // Show the green toast only when NotifyPro confirms the send.
      const pushSent = await this.sendPushConfirmation(this.uid);
      if (pushSent) {
        await this.presentPaymentSuccessToast();
      }
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

  private async presentPaymentSuccessToast(): Promise<void> {
    const title = 'Payment Successful';
    const body = `You have successfully paid an amount of ${this.amountLabel}.`;
    await this.notify.success(`${title} — ${body}`);
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

  private describePushSendError(error: any): string {
    const rawMessage = String((error as any)?.message ?? error ?? '').trim();
    if (!rawMessage) {
      return 'Error desconocido.';
    }

    // HttpService throws:
    // - Native: "HTTP <status>: <body>"
    // - Web:    "HTTP <status> <statusText>: <body>"
    const match = /^HTTP\s+(\d{3})(?:\s+[^:]+)?:\s*(.*)$/s.exec(rawMessage);
    if (!match) {
      return rawMessage;
    }

    const status = Number(match[1]);
    const body = String(match[2] ?? '').trim();

    let msg = body;
    try {
      const parsed = JSON.parse(body);
      msg = String(
        parsed?.extra?.message ??
        parsed?.msg ??
        parsed?.message ??
        parsed?.error ??
        body
      );
    } catch {
      // Keep raw body.
    }

    const normalized = msg.trim();
    if (!normalized) {
      return `HTTP ${status}`;
    }

    if (/cert\s+not\s+found/i.test(normalized)) {
      return 'Falta subir el JSON de Firebase Admin en NotifyPro (Cert not found).';
    }

    if (/senderid\s+mismatch/i.test(normalized)) {
      return 'El JSON subido NO corresponde al Firebase de esta app (SenderId mismatch).';
    }

    if (/registration-token-not-registered|requested\s+entity\s+was\s+not\s+found/i.test(normalized)) {
      return 'El token FCM del dispositivo ya no es válido (token no registrado).';
    }

    if (status === 401 || status === 403) {
      return 'Autenticación de NotifyPro inválida o expirada.';
    }

    return `HTTP ${status}: ${normalized}`;
  }

  private async sendPushConfirmation(uid: string): Promise<boolean> {
    if (!this.pushEnabled) {
      return false;
    }

    let token: string | null = null;
    try {
      token = await this.users.ensurePushToken(uid);
    } catch (error) {
      console.warn('Unable to get push token:', error);
      token = null;
    }
    if (!token) {
      await this.notify.info('No se pudo obtener el token de notificaciones (permiso denegado o no disponible).');
      return false;
    }

    // Auto-login to NotifyPro backend if needed (hardcoded default account).
    try {
      await this.http.ensureNotificationsBackendSession();
    } catch (err) {
      console.warn('Unable to auto-login NotifyPro backend:', err);
      await this.notify.error('No se pudo iniciar sesión automáticamente en NotifyPro.');
      return false;
    }

    try {
      const configured = await this.http.getNotificationsCredentialsStatus();
      if (configured === false) {
        const email = this.http.getStoredNotificationsJwtEmail();
        const who = email ? ` (${email})` : '';
        await this.notify.info(
          `NotifyPro${who} no tiene Firebase configurado. Entra al Dashboard y sube el JSON de Firebase Admin SDK.`
        );
        return false;
      }
    } catch (err) {
      // If status fails, still attempt send and surface the real error.
      console.warn('Unable to check NotifyPro credentials status:', err);
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
      const email = this.http.getStoredNotificationsJwtEmail();
      const who = email ? ` (${email})` : '';
      await this.notify.error(`No se pudo enviar la notificación push${who}: ${this.describePushSendError(err)}`);
      return false;
    }

    return sent;
  }
}
