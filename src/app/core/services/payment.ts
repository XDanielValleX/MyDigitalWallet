import { Injectable } from '@angular/core';
import { QueryConstraint, increment, limit as limitConstraint, orderBy, where } from '@angular/fire/firestore';
import { FirestoreService } from './firestore';

export type WalletTransactionType = 'expense' | 'income';

export type WalletTransaction = {
  id: string;
  title: string;
  amount: number;
  type: WalletTransactionType;
  icon: string;
  createdAt: string; // ISO string
  reaction?: string | null;
  reactedAt?: string;
};

export type CreateWalletTransaction = {
  title: string;
  amount: number;
  type: WalletTransactionType;
  icon?: string;
  createdAt?: string;
};

export type PaymentSimulation = {
  nextBalance: number;
  delta: number;
};

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private firestore: FirestoreService) { }

  async setReaction(uid: string, cardId: string, transactionId: string, reaction: string | null): Promise<void> {
    await this.firestore.updateDoc(`users/${uid}/cards/${cardId}/transactions/${transactionId}`, {
      reaction: reaction ?? null,
      reactedAt: new Date().toISOString()
    });
  }

  simulate(startingBalance: number, type: WalletTransactionType, amount: number): PaymentSimulation {
    const safeAmount = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;
    const delta = type === 'income' ? safeAmount : -safeAmount;
    return {
      delta,
      nextBalance: Number(startingBalance || 0) + delta
    };
  }

  async process(uid: string, cardId: string, input: CreateWalletTransaction): Promise<string> {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const icon = input.icon ?? 'document-outline';
    const amount = Number(input.amount);

    const payload = {
      title: (input.title ?? '').trim(),
      amount: Number.isFinite(amount) ? amount : 0,
      type: input.type,
      icon,
      createdAt
    };

    const id = await this.firestore.addDoc(`users/${uid}/cards/${cardId}/transactions`, payload);

    await this.bumpCardAggregates(uid, cardId, payload.type, payload.amount);

    return id;
  }

  async listByCard(
    uid: string,
    cardId: string,
    options?: {
      limit?: number;
      startIso?: string;
      endIsoExclusive?: string;
    }
  ): Promise<WalletTransaction[]> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (options?.startIso) {
      constraints.push(where('createdAt', '>=', options.startIso));
    }

    if (options?.endIsoExclusive) {
      constraints.push(where('createdAt', '<', options.endIsoExclusive));
    }

    if (typeof options?.limit === 'number' && options.limit > 0) {
      constraints.push(limitConstraint(options.limit));
    }

    const rows = await this.firestore.list<WalletTransaction>(`users/${uid}/cards/${cardId}/transactions`, constraints);
    return rows as any;
  }

  private async bumpCardAggregates(uid: string, cardId: string, type: WalletTransactionType, amount: number) {
    const deltaIncome = type === 'income' ? amount : 0;
    const deltaExpense = type === 'expense' ? amount : 0;
    const deltaBalance = type === 'income' ? amount : -amount;

    try {
      await this.firestore.updateDoc(`users/${uid}/cards/${cardId}`, {
        totalIncome: increment(deltaIncome),
        totalExpense: increment(deltaExpense),
        balance: increment(deltaBalance),
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Card doc should exist; this is a defensive fallback.
      await this.firestore.setDoc(
        `users/${uid}/cards/${cardId}`,
        {
          totalIncome: deltaIncome,
          totalExpense: deltaExpense,
          balance: deltaBalance,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
  }
}
