import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ProfileModalComponent } from '../../shared/components/profile-modal/profile-modal.component';
import { ChangeCardModalComponent } from '../../shared/components/change-card-modal/change-card-modal.component';
import { TotalExpensesModalComponent } from '../../shared/components/total-expenses-modal/total-expenses-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { TransactionListItem } from '../../shared/components/transaction-list/transaction-list.component';
import { PaymentService, WalletTransaction } from '../../core/services/payment';
import type { QuickAction } from '../../shared/components/quick-actions/quick-actions.component';
import { ModalService } from '../../core/services/modal';
import { UserService } from '../../core/services/user';
import { FirestoreService } from '../../core/services/firestore';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  firstName: string = 'Cargando...';
  isLoading = true;
  userCards: any[] = []; // Array para almacenar las tarjetas reales
  visibleCards: any[] = [];
  selectedCardIndex = 0;

  transactions: TransactionListItem[] = [];
  totalIncome = 0;
  totalExpense = 0;
  balance = 0;

  // Notifications bell UI
  readonly inbox$ = this.userService.inbox$;
  readonly unreadCount$ = this.userService.unreadCount$;
  notificationsNeedsSetup = false;

  private defaultCardId: string | null = null;

  private lastNavUrl: string | null = null;
  private lastNavAt = 0;
  private changeCardModalOpen = false;
  private profileModalOpen = false;
  private expensesModalOpen = false;

  readonly homeActions: QuickAction[] = [
    { id: 'changeCard', label: 'Change Card', icon: 'layers-outline', tone: 'teal' },
    { id: 'pay', label: 'Pay Now', icon: 'card-outline', tone: 'lime' },
    { id: 'addCard', label: 'Add Card', icon: 'add-outline', tone: 'dark' }
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private modal: ModalService,
    private userService: UserService,
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private paymentService: PaymentService
  ) { }

  onQuickAction(id: string) {
    switch (id) {
      case 'changeCard':
        void this.openChangeCardModal();
        return;
      case 'pay':
        void this.goToPayment();
        return;
      case 'addCard':
        void this.addCard();
        return;
      default:
        return;
    }
  }

  ionViewWillEnter() {
    // Importante: Ionic puede cachear la vista. Al volver desde Add Card,
    // recargamos para que se vea la tarjeta recién guardada.
    this.getUserData();
  }

  get selectedCard(): any | null {
    return this.userCards[this.selectedCardIndex] ?? null;
  }

  async getUserData() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
      try {
        const profile = await this.userService.getProfile(currentUser.uid);
        if (profile) {
          this.firstName = (profile as any)?.firstName || 'User';
          this.defaultCardId = (profile as any)?.defaultCardId || null;
        }

        // 2. Obtener las tarjetas del usuario (NUEVO)
        await this.getUserCards(currentUser.uid);

        // 3. Obtener transacciones + balance para la tarjeta seleccionada
        await this.loadTransactions(currentUser.uid);

        await this.refreshNotificationsSetupNeeded();

      } catch (error) {
        console.error('Error:', error);
      } finally {
        this.isLoading = false;
      }
  }

  async getUserCards(uid: string) {
    const cards = await this.firestoreService.list<any>(`users/${uid}/cards`);
    // createdAt se guarda como ISO string en Add Card
    this.userCards = cards.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

    const idx = this.defaultCardId
      ? this.userCards.findIndex(c => c?.id === this.defaultCardId)
      : -1;

    this.selectedCardIndex = idx >= 0 ? idx : 0;
    this.updateVisibleCards();
  }

  private async loadTransactions(uid: string) {
    const cardId = this.selectedCard?.id as string | undefined;
    if (!cardId) {
      this.transactions = [];
      this.totalIncome = 0;
      this.totalExpense = 0;
      this.balance = 0;
      return;
    }

    const all = await this.paymentService.listByCard(uid, cardId);

    let income = 0;
    let expense = 0;
    for (const t of all) {
      const amount = Number((t as any)?.amount ?? 0);
      if ((t as any)?.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }
    }

    this.totalIncome = income;
    this.totalExpense = expense;
    this.balance = income - expense;

    this.transactions = all.slice(0, 3).map(t => this.mapTxnToListItem(t));
  }

  private mapTxnToListItem(txn: WalletTransaction): TransactionListItem {
    return {
      id: txn.id,
      title: txn.title,
      date: this.formatTxnDate(txn.createdAt),
      amount: Number(txn.amount ?? 0),
      type: txn.type,
      icon: txn.icon || 'document-outline',
      reaction: (txn as any)?.reaction ?? null
    };
  }

  private formatTxnDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();

    return `${time} - ${day} ${month}, ${year}`;
  }

  private updateVisibleCards() {
    // stack (máx 3) pero en bucle para que nunca "desaparezcan" las otras
    const total = this.userCards.length;
    if (!total) {
      this.visibleCards = [];
      return;
    }

    const start = ((this.selectedCardIndex % total) + total) % total;
    const count = Math.min(3, total);

    const next: any[] = [];
    for (let offset = 0; offset < count; offset++) {
      next.push(this.userCards[(start + offset) % total]);
    }

    this.visibleCards = next;
  }

  trackByCardId(index: number, card: any): string | number {
    return card?.id ?? index;
  }

  // Función para el botón de la foto (abre el perfil/biometría)
  async openProfile() {
    if (this.profileModalOpen) {
      return;
    }
    this.profileModalOpen = true;

    try {
      await this.modal.openAndWait(ProfileModalComponent, {
        cssClass: 'mdw-profile-modal',
        backdropDismiss: true,
        showBackdrop: true,
        breakpoints: [0, 1],
        initialBreakpoint: 1,
        expandToScroll: true,
        handle: true
      });
      // Refresh Home state after closing profile (push settings can change without pressing "Save").
      await this.getUserData();
    } finally {
      this.profileModalOpen = false;
    }
  }

  onNotificationsButtonClick() {
    // "Unread" means: user hasn't opened this panel.
    this.userService.markAllInboxSeen();
  }

  formatInboxDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  }

  private async refreshNotificationsSetupNeeded(): Promise<void> {
    const granted = await this.userService.isNotificationsPermissionGranted();
    this.notificationsNeedsSetup = !granted;
  }

  async openTotalExpenses() {
    if (this.expensesModalOpen) {
      return;
    }
    this.expensesModalOpen = true;

    try {
      await this.modal.openAndWait(TotalExpensesModalComponent, {
        cssClass: 'mdw-total-expenses-modal',
        componentProps: {
          cards: this.userCards,
          selectedIndex: this.selectedCardIndex
        }
      });

      // Re-fetch so reactions added inside the modal show on Home.
      const user = this.auth.currentUser;
      if (user) {
        await this.loadTransactions(user.uid);
      }
    } finally {
      this.expensesModalOpen = false;
    }
  }

  private async safeNavigate(url: string) {
    const now = Date.now();
    if (this.lastNavUrl === url && now - this.lastNavAt < 600) {
      return;
    }
    this.lastNavUrl = url;
    this.lastNavAt = now;

    try {
      const ok = await this.router.navigateByUrl(url);
      if (ok) {
        return;
      }
    } catch {
      // Ignore: some emulators/extensions monkey-patch History API.
    }

    // Fallback without touching History.pushState (keeps SPA navigation when History is broken)
    try {
      const ok = await this.router.navigateByUrl(url, { skipLocationChange: true });
      if (ok) {
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: algunos emuladores/extensiones bloquean o rompen el History API.
    window.location.assign(url);
  }

  async goToPayment() {
    await this.safeNavigate('/tabs/payment');
  }

  async openChangeCardModal() {
    if (this.changeCardModalOpen) {
      return;
    }
    this.changeCardModalOpen = true;

    try {
      const result = await this.modal.openAndWait(ChangeCardModalComponent, {
        cssClass: 'mdw-change-card-modal',
        componentProps: {
          cards: this.userCards,
          selectedIndex: this.selectedCardIndex
        }
      });
      if (result.role === 'selected') {
        const cardId = result.data?.cardId as string | undefined;
        const index = typeof result.data?.index === 'number' ? (result.data.index as number) : -1;

        let nextIndex = index;
        if (cardId) {
          const found = this.userCards.findIndex(c => c?.id === cardId);
          nextIndex = found >= 0 ? found : nextIndex;
        }

        if (nextIndex >= 0 && nextIndex < this.userCards.length) {
          this.selectedCardIndex = nextIndex;
          this.defaultCardId = this.userCards[nextIndex]?.id ?? null;
          this.updateVisibleCards();

          const user = this.auth.currentUser;
          if (user) {
            await this.loadTransactions(user.uid);
          }

          try {
            await Haptics.impact({ style: ImpactStyle.Medium });
          } catch {
            // ignore haptics failures
          }

          if (user && this.defaultCardId) {
            await this.userService.setDefaultCardId(user.uid, this.defaultCardId);
          }
        }
      }
    } finally {
      this.changeCardModalOpen = false;
    }
  }

  // Función para el botón de añadir tarjeta
  async addCard() {
    await this.safeNavigate('/tabs/add-card');
  }

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/login']).catch(() => window.location.assign('/login'));
  }
}