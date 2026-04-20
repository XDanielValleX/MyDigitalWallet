import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { HttpService } from './http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private socialLoginInitPromise: Promise<void> | null = null;

  constructor(
    private auth: Auth,
    private firestore: Firestore, // Inyectamos Firestore
    private injector: Injector,
    private http: HttpService
  ) { }

  async loginWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      await this.ensureSocialLoginInitialized();

      const res = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });

      const result: any = (res as any)?.result ?? null;
      if (!result || (result.responseType && result.responseType !== 'online')) {
        throw new Error('Google Sign-In failed to return an online response.');
      }

      const idToken: string | null = result?.idToken ?? null;
      const accessToken: string | null = result?.accessToken?.token ?? null;
      if (!idToken && !accessToken) {
        throw new Error('Google Sign-In did not return tokens.');
      }

      const credential = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
      const userCredential = await runInInjectionContext(this.injector, () => signInWithCredential(this.auth, credential));

      await this.ensureUserProfileDoc(userCredential.user, result?.profile);
      return userCredential;
    }

    // Web fallback (native plugins not available)
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const userCredential = await runInInjectionContext(this.injector, () => signInWithPopup(this.auth, provider));
    await this.ensureUserProfileDoc(userCredential.user);
    return userCredential;
  }

  private async ensureSocialLoginInitialized(): Promise<void> {
    if (this.socialLoginInitPromise) {
      return this.socialLoginInitPromise;
    }

    const webClientId = String((environment as any)?.googleAuth?.webClientId ?? '').trim();
    if (!webClientId) {
      throw new Error('Missing environment.googleAuth.webClientId');
    }

    this.socialLoginInitPromise = SocialLogin.initialize({
      google: {
        webClientId,
      },
    });

    try {
      await this.socialLoginInitPromise;
    } catch (err) {
      this.socialLoginInitPromise = null;
      throw err;
    }
  }

  private async ensureUserProfileDoc(user: any, googleProfile?: any): Promise<void> {
    const uid = String(user?.uid ?? '').trim();
    if (!uid) {
      return;
    }

    const userDocRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${uid}`));
    const snap = await runInInjectionContext(this.injector, () => getDoc(userDocRef));

    const now = new Date().toISOString();
    const email = String(user?.email ?? googleProfile?.email ?? '').trim();

    if (snap.exists()) {
      const patch: any = {
        uid,
        updatedAt: now,
      };
      if (email) {
        patch.email = email;
      }

      await runInInjectionContext(this.injector, () => setDoc(userDocRef, patch, { merge: true }));
      return;
    }

    const { firstName, lastName } = this.deriveNameParts(user?.displayName, googleProfile);

    const data: any = {
      uid,
      createdAt: now,
      updatedAt: now,
    };
    if (email) {
      data.email = email;
    }
    if (firstName) {
      data.firstName = firstName;
    }
    if (lastName) {
      data.lastName = lastName;
    }

    await runInInjectionContext(this.injector, () => setDoc(userDocRef, data, { merge: true }));
  }

  private deriveNameParts(displayName?: string | null, googleProfile?: any): { firstName: string; lastName: string } {
    const givenName = String(googleProfile?.givenName ?? '').trim();
    const familyName = String(googleProfile?.familyName ?? '').trim();
    if (givenName || familyName) {
      return { firstName: givenName, lastName: familyName };
    }

    const name = String(displayName ?? googleProfile?.name ?? '').trim();
    if (!name) {
      return { firstName: '', lastName: '' };
    }

    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  // 1. Iniciar Sesión (Solo requiere 2 argumentos)
  async login(email: string, password: string) {
    const credential = await runInInjectionContext(this.injector, () => signInWithEmailAndPassword(this.auth, email, password));

    // Notion: authenticate against Railway notifications backend to obtain JWT.
    // Best-effort: don't block login if the service is unavailable.
    void this.http.loginNotificationsBackend(email, password).catch(() => { });

    return credential;
  }

  // 2. Registro (Requiere 3 argumentos: email, password y userData)
  async register(email: string, password: string, userData: any) {
    // A. Creamos el usuario en Firebase Authentication
    const userCredential = await runInInjectionContext(this.injector, () => createUserWithEmailAndPassword(this.auth, email, password));
    const user = userCredential.user;

    // B. Creamos la referencia al documento en la colección 'users' de Firestore
    // Usamos el UID (User ID) generado por Auth como el ID del documento
    const userDocRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${user.uid}`));

    // C. Guardamos el "Perfil Completo" en Firestore
    await runInInjectionContext(this.injector, () => setDoc(userDocRef, {
      ...userData,          // Esparce los datos: firstName, lastName, docType, etc.
      email: email,         // Guardamos el email también en el documento
      uid: user.uid,        // Guardamos el UID por referencia
      createdAt: new Date() // Agregamos la fecha de creación
    }));

    // Notion: authenticate against Railway notifications backend to obtain JWT.
    void this.http.loginNotificationsBackend(email, password).catch(() => { });

    return userCredential;
  }

  // 3. Cerrar Sesión
  logout() {
    this.http.clearStoredNotificationsJwt();
    return runInInjectionContext(this.injector, () => signOut(this.auth));
  }
}