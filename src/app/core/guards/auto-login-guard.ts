import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AutoLoginGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router, private injector: Injector) { }

  canActivate(): Observable<boolean> {
    return runInInjectionContext(this.injector, () => authState(this.auth)).pipe(
      map(user => {
        if (user) {
          // Ajusta '/tabs/home' a la ruta principal de tu app si es diferente
          void this.router.navigate(['/tabs/home']).catch(() => window.location.assign('/tabs/home'));
          return false; // Bloquea el acceso al Login
        } else {
          return true; // No hay sesión, lo deja ver el Login
        }
      })
    );
  }
}