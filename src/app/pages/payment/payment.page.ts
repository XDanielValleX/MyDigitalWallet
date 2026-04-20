import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { faker } from '@faker-js/faker';
import { FirestoreService } from '../../core/services/firestore';
import { ModalService } from '../../core/services/modal';
import { UserService } from '../../core/services/user';
import { NotificationService } from '../../core/services/notification';
import { PaymentSimulatorComponent } from '../../shared/components/payment-simulator/payment-simulator.component';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: false
})
export class PaymentPage implements OnInit {

  isLoading = true;
  card: any | null = null;
  balance = 0;
  biometricsEnabled = false;
  pushEnabled = true;

  readonly backIcon = arrowBackOutline;

  merchant = '';
  amount = 0;

  private uid: string | null = null;
  private cardId: string | null = null;
  simulatorOpen = false;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private firestore: FirestoreService,
    private modal: ModalService,
    private notify: NotificationService,
    private router: Router
  ) { }

  ngOnInit() { }

  async backToHome() {
	await this.router.navigateByUrl('/tabs/home', { replaceUrl: true }).catch(() => window.location.assign('/tabs/home'));
  }

  ionViewWillEnter() {
    this.resetSimulation();
    void this.loadDefaultCard();
  }

  private resetSimulation() {
    // faker: realistic merchant + amount
    const suffixes = ['Group', 'LLC', 'and Sons', 'Inc'];
    const base = faker.company.name();
    const suffix = suffixes[faker.number.int({ min: 0, max: suffixes.length - 1 })];
    this.merchant = `${base} ${suffix}`.replace(/\s+/g, ' ').trim();

    // Avoid tiny amounts; generate two decimals.
    const val = faker.number.float({ min: 5, max: 500, fractionDigits: 2 });
    this.amount = Number.isFinite(val) ? val : 0;
  }

  private async loadDefaultCard() {
    const user = this.auth.currentUser;
    if (!user) {
      this.uid = null;
      this.cardId = null;
      this.card = null;
      this.balance = 0;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.uid = user.uid;

    try {
      const profile = await this.userService.getProfile(user.uid);
      const preferredCardId = (profile as any)?.defaultCardId as string | null | undefined;
      this.biometricsEnabled = Boolean((profile as any)?.biometricsEnabled);
      this.pushEnabled = (profile as any)?.pushEnabled !== false;

      const cards = await this.firestore.list<any>(`users/${user.uid}/cards`);
      const chosen = preferredCardId
        ? cards.find(c => c?.id === preferredCardId) ?? cards[0]
        : cards[0];

      this.card = chosen ?? null;
      this.cardId = chosen?.id ?? null;

      const rawBalance = Number(chosen?.balance ?? 0);
      this.balance = Number.isFinite(rawBalance) ? rawBalance : 0;
    } catch (e) {
      console.error(e);
      await this.notify.error('No se pudo cargar la tarjeta.');
    } finally {
      this.isLoading = false;
    }
  }

  async confirmPayment() {
    if (this.simulatorOpen) {
      return;
    }
    this.simulatorOpen = true;

    try {
      if (!this.uid || !this.cardId || !this.card) {
        await this.notify.error('No card selected.');
        return;
      }

      const result = await this.modal.openAndWait(PaymentSimulatorComponent, {
        cssClass: 'mdw-payment-simulator-modal',
        backdropDismiss: false,
        canDismiss: async (_data, role) => role === 'done' || role === 'cancel',
        componentProps: {
          startingBalance: this.balance,
          uid: this.uid,
          cardId: this.cardId,
          card: this.card,
          biometricsEnabled: this.biometricsEnabled,
          pushEnabled: this.pushEnabled,
          variant: 'status',
          autoStart: true,
          merchant: this.merchant,
          amount: this.amount,
        }
      });

      if (result.role !== 'done') {
        return;
      }

      const updated = await this.firestore.getDoc<any>(`users/${this.uid}/cards/${this.cardId}`);
      if (updated) {
        this.card = updated;
        const rawBalance = Number((updated as any)?.balance ?? this.balance);
        this.balance = Number.isFinite(rawBalance) ? rawBalance : this.balance;
      }

	  await this.backToHome();
    } finally {
      this.simulatorOpen = false;
    }
  }

  async goAddCard() {
    await this.router.navigateByUrl('/tabs/add-card').catch(() => window.location.assign('/tabs/add-card'));
  }

}
