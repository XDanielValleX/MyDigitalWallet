import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
// Ajusta esta ruta según donde tengas guardado tu servicio
import { AuthService } from '../../core/services/auth';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService, // <-- Inyectamos el servicio
    private notify: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() { }

  async onLogin() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      try {
        // Llamamos al servicio de Firebase
        await this.authService.login(email, password);
        console.log('¡Login Exitoso!');
        // Si todo sale bien, lo mandamos a los tabs (al Home)
        await this.router.navigate(['/tabs']).catch(() => window.location.assign('/tabs'));
      } catch (error) {
        console.error('Error al iniciar sesión:', error);
        await this.notify.error('Credenciales incorrectas o error de conexión.');
      }
    }
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/tabs']).catch(() => window.location.assign('/tabs'));
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      await this.notify.error('No se pudo iniciar sesión con Google.');
    }
  }
}