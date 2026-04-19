import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../pages/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'add-card',
        loadChildren: () => import('../pages/add-card/add-card.module').then(m => m.AddCardPageModule)
      },
      {
        path: 'payment',
        loadChildren: () => import('../pages/payment/payment.module').then(m => m.PaymentPageModule)
      },
      {
        // Ruta por defecto cuando se entra a los tabs
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full'
      }
    ]
  },
  {
    // Redirección inicial
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule { }