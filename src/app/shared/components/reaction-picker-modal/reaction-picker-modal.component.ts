import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-reaction-picker-modal',
  templateUrl: './reaction-picker-modal.component.html',
  styleUrls: ['./reaction-picker-modal.component.scss'],
  standalone: false
})
export class ReactionPickerModalComponent implements OnInit {
  @Input() title = '✨ Choose your reaction';

  isDark = false;

  constructor(
    private modalCtrl: ModalController,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.isDark = this.userService.getEffectiveIsDark();
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async onEmojiSelect(ev: any) {
    const emoji = String(ev?.emoji?.native ?? ev?.native ?? '').trim();
    if (!emoji) {
      return;
    }

    await this.modalCtrl.dismiss({ emoji }, 'selected');
  }
}
