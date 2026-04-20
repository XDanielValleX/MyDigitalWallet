import { Component, Input, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ModalController } from '@ionic/angular';
import { PaymentService, WalletTransaction } from '../../../core/services/payment';
import type { TransactionListItem } from '../transaction-list/transaction-list.component';
import { ReactionPickerModalComponent } from '../reaction-picker-modal/reaction-picker-modal.component';

@Component({
  selector: 'app-total-expenses-modal',
  templateUrl: './total-expenses-modal.component.html',
  standalone: false
})
export class TotalExpensesModalComponent implements OnInit {
  @Input() cards: any[] = [];
  @Input() selectedIndex = 0;

  activeCardId: string | null = null;

  year = new Date().getFullYear();
  month = new Date().getMonth(); // 0-11

  selectedDay: number | null = null;
  daysWithTx: number[] = [];

  totalSpent = 0;
  transactions: TransactionListItem[] = [];

  private monthExpenses: WalletTransaction[] = [];

  private reactionPickerOpen = false;

  constructor(
    private modalCtrl: ModalController,
    private auth: Auth,
    private paymentService: PaymentService
  ) { }

  get activeCard(): any | null {
    if (!this.activeCardId) {
      return null;
    }
    return this.cards?.find(c => c?.id === this.activeCardId) ?? null;
  }

  get monthLabel(): string {
    const d = new Date(this.year, this.month, 1);
    // ej: "abril de 2026" (como en el ejemplo)
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  ngOnInit() {
    this.activeCardId = this.cards?.[this.selectedIndex]?.id ?? this.cards?.[0]?.id ?? null;
    void this.refresh();
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'close');
  }

  last4(cardNumber: string): string {
    const clean = String(cardNumber ?? '').replace(/\D/g, '');
    return clean.length >= 4 ? clean.slice(-4) : '----';
  }

  async onCardChange(ev: CustomEvent) {
    const nextId = String((ev as any)?.detail?.value ?? '');
    this.activeCardId = nextId || null;
    this.selectedDay = null;
    await this.refresh();
  }

  async prevMonth() {
    const d = new Date(this.year, this.month, 1);
    d.setMonth(d.getMonth() - 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.selectedDay = null;
    await this.refresh();
  }

  async nextMonth() {
    const d = new Date(this.year, this.month, 1);
    d.setMonth(d.getMonth() + 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.selectedDay = null;
    await this.refresh();
  }

  async onReactionRequested(item: TransactionListItem) {
    if (this.reactionPickerOpen) {
      return;
    }

    const user = this.auth.currentUser;
    const cardId = this.activeCardId;
    const transactionId = String(item?.id ?? '').trim();
    if (!user || !cardId || !transactionId) {
      return;
    }

    this.reactionPickerOpen = true;
    try {
      const modal = await this.modalCtrl.create({
        component: ReactionPickerModalComponent,
        cssClass: 'mdw-reaction-picker-modal',
        breakpoints: [0, 0.6, 0.9],
        initialBreakpoint: 0.6,
        handle: true,
        backdropDismiss: false,
        showBackdrop: true
      });

      await modal.present();
      const result = await modal.onWillDismiss();
      if (result.role !== 'selected') {
        return;
      }

      const emoji = String((result as any)?.data?.emoji ?? '').trim();
      if (!emoji) {
        return;
      }

      await this.paymentService.setReaction(user.uid, cardId, transactionId, emoji);

      // Update local state so the emoji shows immediately.
      for (const t of this.monthExpenses) {
        if (t.id === transactionId) {
          (t as any).reaction = emoji;
          (t as any).reactedAt = new Date().toISOString();
          break;
        }
      }

      this.transactions = this.transactions.map(tx =>
        String(tx.id) === transactionId
          ? { ...tx, reaction: emoji }
          : tx
      );
    } finally {
      this.reactionPickerOpen = false;
    }
  }

  onSelectedDayChange(day: number | null) {
    this.selectedDay = day;
    this.applyDayFilter();
  }

  private async refresh() {
    const user = this.auth.currentUser;
    const cardId = this.activeCardId;
    if (!user || !cardId) {
      this.monthExpenses = [];
      this.daysWithTx = [];
      this.totalSpent = 0;
      this.transactions = [];
      return;
    }

    const start = new Date(this.year, this.month, 1);
    const end = new Date(this.year, this.month + 1, 1);

    const all = await this.paymentService.listByCard(user.uid, cardId, {
      startIso: start.toISOString(),
      endIsoExclusive: end.toISOString()
    });

    this.monthExpenses = all.filter(t => (t as any)?.type === 'expense');
    this.daysWithTx = this.computeDaysWithTx(this.monthExpenses);
    this.applyDayFilter();
  }

  private computeDaysWithTx(transactions: WalletTransaction[]): number[] {
    const days = new Set<number>();
    for (const t of transactions) {
      const d = new Date(t.createdAt);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === this.year && d.getMonth() === this.month) {
        days.add(d.getDate());
      }
    }
    return Array.from(days).sort((a, b) => a - b);
  }

  private applyDayFilter() {
    const filtered = this.selectedDay
      ? this.monthExpenses.filter(t => new Date(t.createdAt).getDate() === this.selectedDay)
      : this.monthExpenses;

    let total = 0;
    for (const t of filtered) {
      total += Number((t as any)?.amount ?? 0);
    }

    this.totalSpent = total;
    this.transactions = filtered.map(t => this.mapTxnToListItem(t));
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
}
