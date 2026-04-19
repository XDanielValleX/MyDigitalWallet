import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

export interface UserProfile {
  uid?: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  country: string;
  email: string;
  biometricEnabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) { }

  // --- REGISTRO CON EMAIL Y PASSWORD ---
  async register(profileData: UserProfile, password: string): Promise<any> {
    try {
      // 1. Crear el usuario en Firebase Authentication
      const credential = await this.afAuth.createUserWithEmailAndPassword(profileData.email, password);

      // 2. Extraer el UID generado
      const uid = credential.user?.uid;

      // 3. Guardar el perfil completo en Firestore (Regla de negocio)
      if (uid) {
        await this.firestore.collection('users').doc(uid).set({
          ...profileData,
          uid: uid,
          biometricEnabled: false, // Por defecto desactivado hasta que el usuario lo enrole
          createdAt: new Date()
        });
      }
      return credential.user;
    } catch (error) {
      console.error('Error en el registro:', error);
      throw error;
    }
  }

  // --- LOGIN CON EMAIL Y PASSWORD ---
  async login(email: string, password: string): Promise<any> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      return credential.user;
    } catch (error) {
      console.error('Error en el login:', error);
      throw error;
    }
  }

  // --- LOGOUT ---
  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/auth/login']); // Asumiendo que esta será tu ruta de login
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  // --- OBTENER EL USUARIO ACTUAL ---
  getCurrentUser() {
    return this.afAuth.authState;
  }
}