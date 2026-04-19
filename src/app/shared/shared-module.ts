import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular'; // Vital para la interfaz

// Importación de todos tus componentes
import { BalanceDisplayComponent } from './components/balance-display/balance-display.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { CardComponent } from './components/card/card.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { PaymentSimulatorComponent } from './components/payment-simulator/payment-simulator.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';
import { SkeletonLoadingComponent } from './components/skeleton-loading/skeleton-loading.component';
import { TransactionItemComponent } from './components/transaction-item/transaction-item.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';

@NgModule({
  declarations: [
    BalanceDisplayComponent,
    CalendarComponent,
    CardComponent,
    CustomInputComponent,
    PaymentSimulatorComponent,
    QuickActionsComponent,
    SkeletonLoadingComponent,
    TransactionItemComponent,
    TransactionListComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    // Exportamos todo para que cualquier página que importe este módulo pueda usarlos
    BalanceDisplayComponent,
    CalendarComponent,
    CardComponent,
    CustomInputComponent,
    PaymentSimulatorComponent,
    QuickActionsComponent,
    SkeletonLoadingComponent,
    TransactionItemComponent,
    TransactionListComponent
  ]
})
export class SharedModule { }