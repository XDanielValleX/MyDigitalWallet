import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) { }

  canActivate(): Observable<boolean> {
    return authState(this.auth).pipe(
      map(user => {
        if (user) {
          return true; // El usuario tiene sesión, lo dejamos pasar
        } else {
          this.router.navigate(['/login']); // No hay sesión, pa' fuera
          return false;
        }
      })
    );
  }
}