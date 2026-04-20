import { Injectable } from '@angular/core';
import { DialogConfirmOptions, DialogService } from './dialog';
import { ToastService } from './toast';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private toast: ToastService,
    private dialog: DialogService
  ) { }

  info(message: string) {
    return this.toast.show(message, { color: 'medium' });
  }

  success(message: string) {
    return this.toast.success(message);
  }

  error(message: string) {
    return this.toast.error(message);
  }

  confirm(options: DialogConfirmOptions): Promise<boolean> {
    return this.dialog.confirm(options);
  }
}
