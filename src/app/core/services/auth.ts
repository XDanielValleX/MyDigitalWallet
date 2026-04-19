import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private firestore: Firestore // Inyectamos Firestore
  ) { }

  // 1. Iniciar Sesión (Solo requiere 2 argumentos)
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // 2. Registro (Requiere 3 argumentos: email, password y userData)
  async register(email: string, password: string, userData: any) {
    // A. Creamos el usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;

    // B. Creamos la referencia al documento en la colección 'users' de Firestore
    // Usamos el UID (User ID) generado por Auth como el ID del documento
    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    // C. Guardamos el "Perfil Completo" en Firestore
    await setDoc(userDocRef, {
      ...userData,          // Esparce los datos: firstName, lastName, docType, etc.
      email: email,         // Guardamos el email también en el documento
      uid: user.uid,        // Guardamos el UID por referencia
      createdAt: new Date() // Agregamos la fecha de creación
    });

    return userCredential;
  }

  // 3. Cerrar Sesión
  logout() {
    return signOut(this.auth);
  }
}