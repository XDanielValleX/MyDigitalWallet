import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular'; // Vital para la interfaz
import { PickerModule } from '@ctrl/ngx-emoji-mart';

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
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { ChangeCardModalComponent } from './components/change-card-modal/change-card-modal.component';
import { TotalExpensesModalComponent } from './components/total-expenses-modal/total-expenses-modal.component';
import { ReactionPickerModalComponent } from './components/reaction-picker-modal/reaction-picker-modal.component';

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
    TransactionListComponent,
    ProfileModalComponent,
    ChangeCardModalComponent,
    TotalExpensesModalComponent,
    ReactionPickerModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PickerModule
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
    TransactionListComponent,
    ProfileModalComponent,
    ChangeCardModalComponent,
    TotalExpensesModalComponent,
    ReactionPickerModalComponent
  ]
})
export class SharedModule { }