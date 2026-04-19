import { Component, Input } from '@angular/core';

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
}