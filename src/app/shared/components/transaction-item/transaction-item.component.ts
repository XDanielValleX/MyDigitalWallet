import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss'],
  standalone: false
})
export class TransactionItemComponent {
  // Estos inputs reciben la info desde la lista principal
  @Input() title: string = '';
  @Input() date: string = '';
  @Input() amount: number = 0;
  @Input() type: string = 'expense'; // 'income' (ingreso) o 'expense' (gasto)
  @Input() icon: string = 'cash-outline';

  @Input() reaction: string | null = null;

  /** When enabled, tapping/clicking an expense emits `reactionLongPress` (reaction request). */
  @Input() enableReactions = false;

  @Output() reactionLongPress = new EventEmitter<void>();

  onTap() {
    if (!this.enableReactions || this.type !== 'expense') {
      return;
    }
    this.reactionLongPress.emit();
  }
}