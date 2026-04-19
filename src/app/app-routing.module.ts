import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

// 1. Importamos los guardias de seguridad que acabamos de configurar
import { AuthGuard } from './core/guards/auth-guard';
import { AutoLoginGuard } from './core/guards/auto-login-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule),
    canActivate: [AutoLoginGuard] // <-- Vigila que no entres si ya tienes sesión
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule),
    canActivate: [AutoLoginGuard] // <-- Igual aquí, no puedes registrarte si ya estás dentro
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard] // <-- Protege tu Dashboard/Home para que nadie entre sin cuenta
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }