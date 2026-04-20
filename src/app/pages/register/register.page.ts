import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService, // <-- Inyectamos el servicio
    private notify: NotificationService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      docType: ['', Validators.required],
      docNumber: ['', Validators.required],
      country: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() { }

  async onRegister() {
    if (this.registerForm.valid) {
      // Extraemos email y password, y agrupamos el resto en 'userData'
      const { email, password, ...userData } = this.registerForm.value;

      try {
        // Llamamos al servicio para registrar en Auth y guardar en Firestore
        await this.authService.register(email, password, userData);
        console.log('¡Registro y guardado en Firestore exitoso!');

        // Redirigimos al Home
        await this.router.navigate(['/tabs']).catch(() => window.location.assign('/tabs'));
      } catch (error) {
        console.error('Error al registrar usuario:', error);
        await this.notify.error('Hubo un error al crear la cuenta. Verifica los datos.');
      }
    }
  }
}