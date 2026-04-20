import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Capacitor } from '@capacitor/core';

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

  /** When enabled, long-pressing an expense for 2s will emit `reactionLongPress`. */
  @Input() enableReactions = false;

  @Output() reactionLongPress = new EventEmitter<void>();

  private readonly useLongPress = Capacitor.isNativePlatform();

  private longPressTimer: number | null = null;
  private pressStartX = 0;
  private pressStartY = 0;

  onTap() {
    if (!this.enableReactions || this.type !== 'expense') {
      return;
    }

    // Mobile UX: long-press only. Web UX: click.
    if (this.useLongPress) {
      return;
    }

    this.cancelLongPress();
    this.reactionLongPress.emit();
  }

  onPressStart(ev: PointerEvent) {
    if (!this.enableReactions || this.type !== 'expense') {
      return;
    }

    if (!this.useLongPress) {
      return;
    }

    this.cancelLongPress();

    this.pressStartX = ev?.clientX ?? 0;
    this.pressStartY = ev?.clientY ?? 0;

    this.longPressTimer = window.setTimeout(() => {
      this.longPressTimer = null;
      this.reactionLongPress.emit();
    }, 2000);
  }

  onPressMove(ev: PointerEvent) {
    if (!this.useLongPress) {
      return;
    }

    if (!this.longPressTimer) {
      return;
    }

    const dx = (ev?.clientX ?? 0) - this.pressStartX;
    const dy = (ev?.clientY ?? 0) - this.pressStartY;
    if (Math.hypot(dx, dy) > 12) {
      this.cancelLongPress();
    }
  }

  onPressEnd() {
    if (!this.useLongPress) {
      return;
    }

    this.cancelLongPress();
  }

  private cancelLongPress() {
    if (this.longPressTimer) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}