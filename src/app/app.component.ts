import { Component } from '@angular/core';
import { UserService } from './core/services/user';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private userService: UserService) {
    // Keep reference so the service initializes on app start.
    void this.userService;
  }
}
