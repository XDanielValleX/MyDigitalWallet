import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ModalController } from '@ionic/angular';
import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  // Cambiamos userName por firstName para que coincida con el HTML
  firstName: string = 'Cargando...';

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private modalCtrl: ModalController // Lo necesitaremos para el perfil
  ) { }

  ngOnInit() {
    this.getUserData();
  }

  async getUserData() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Mapeamos el campo firstName de Firestore
          this.firstName = userData['firstName'] || 'User';
        }
      } catch (error) {
        console.error('Error al obtener datos:', error);
        this.firstName = 'User';
      }
    }
  }

  // Función para el botón de la foto (abre el perfil/biometría)
  async openProfile() {
    console.log('Abriendo perfil...');
    // Aquí luego llamaremos al modal de biometría
  }

  goToPayment() {
    this.router.navigate(['/tabs/payment']);
  }

  async openChangeCardModal() {
    const modal = await this.modalCtrl.create({
      component: CardComponent
    });

    await modal.present();
  }

  // Función para el botón de añadir tarjeta
  addCard() {
    this.router.navigate(['/tabs/add-card']);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}