import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    // Cuando el usuario entra a la raíz de la app, lo mandamos al login
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    // Ruta de Autenticación (Login / Registro)
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthPageModule)
  },
  {
    // Ruta principal una vez que el usuario inicia sesión (contendrá el Home, Payment, etc.)
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }