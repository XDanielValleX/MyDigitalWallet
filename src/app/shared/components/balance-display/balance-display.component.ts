import { Component } from '@angular/core';

@Component({
  selector: 'app-balance-display',
  templateUrl: './balance-display.component.html',
  styleUrls: ['./balance-display.component.scss'],
  standalone: false
})
export class BalanceDisplayComponent {
  balance: number = 150000; // Saldo simulado temporal
  showBalance: boolean = true; // Interruptor para ocultar/mostrar

  toggleBalance() {
    this.showBalance = !this.showBalance;
  }
}