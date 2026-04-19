import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../pages/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'payment',
        loadChildren: () => import('../pages/payment/payment.module').then(m => m.PaymentPageModule)
      },
      {
        path: 'add-card',
        loadChildren: () => import('../pages/add-card/add-card.module').then(m => m.AddCardPageModule)
      },
      {
        // Si el usuario entra a '/tabs' sin especificar a dónde, lo mandamos a 'home'
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule { }