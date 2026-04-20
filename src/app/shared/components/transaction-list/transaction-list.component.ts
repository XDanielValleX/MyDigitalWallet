import { Component, EventEmitter, Input, Output } from '@angular/core';

export type TransactionListItem = {
  id?: string | number;
  title: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
  icon: string;
  reaction?: string | null;
};

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
  standalone: false
})
export class TransactionListComponent {
  @Input() transactions: TransactionListItem[] = [];

  /** Enables long-press reactions on items (used in View All / Total Expenses). */
  @Input() enableReactions = false;

  /** Emits when the user long-presses an item to add/change a reaction. */
  @Output() reactionRequested = new EventEmitter<TransactionListItem>();
}