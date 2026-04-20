import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddCardPageRoutingModule } from './add-card-routing.module';
import { AddCardPage } from './add-card.page';

// 1. Importas tu SharedModule (verifica que la ruta sea correcta según tus carpetas)
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddCardPageRoutingModule,
    ReactiveFormsModule,
    SharedModule // 2. Lo agregas al arreglo de imports
  ],
  declarations: [AddCardPage]
})
export class AddCardPageModule { }