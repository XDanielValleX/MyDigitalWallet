import { Component, EventEmitter, Input, Output } from '@angular/core';

export type QuickActionTone = 'teal' | 'lime' | 'dark' | string;

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  tone?: QuickActionTone;
};

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss'],
  standalone: false
})
export class QuickActionsComponent {
  @Input() actions: QuickAction[] = [
    { id: 'transfer', label: 'Transferir', icon: 'swap-horizontal-outline', tone: 'teal' },
    { id: 'topup', label: 'Recargar', icon: 'cash-outline', tone: 'lime' },
    { id: 'pay', label: 'Pagar', icon: 'card-outline', tone: 'dark' }
  ];

  @Output() action = new EventEmitter<string>();

  onAction(id: string) {
    this.action.emit(id);
  }
}
