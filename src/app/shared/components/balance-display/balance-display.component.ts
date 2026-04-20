import { Component, Input } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-balance-display',
  templateUrl: './balance-display.component.html',
  styleUrls: ['./balance-display.component.scss'],
  standalone: false
})
export class BalanceDisplayComponent {
  @Input() totalBalance: number = 0;
  isVisible: boolean = true;

  constructor(private userService: UserService) {
    this.isVisible = this.userService.getBalanceVisible();
  }

  async toggleVisibility() {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.isVisible = !this.isVisible;
    this.userService.setBalanceVisible(this.isVisible);
  }
}