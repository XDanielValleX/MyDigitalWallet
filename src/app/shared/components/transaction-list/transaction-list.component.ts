import { Component } from '@angular/core';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
  standalone: false
})
export class TransactionListComponent {
  // Datos de prueba para maquetar la interfaz
  transactions = [
    { id: 1, title: 'Netflix', date: '19 Abr 2026', amount: 35000, type: 'expense', icon: 'tv-outline' },
    { id: 2, title: 'Transferencia recibida', date: '18 Abr 2026', amount: 150000, type: 'income', icon: 'arrow-down-outline' },
    { id: 3, title: 'Supermercado', date: '17 Abr 2026', amount: 85000, type: 'expense', icon: 'cart-outline' }
  ];
}