import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore as AngularFirestore,
  QueryConstraint,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import type { SetOptions } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(
    private firestore: AngularFirestore,
    private injector: Injector
  ) { }

  async getDoc<T = any>(path: string): Promise<(T & { id: string }) | null> {
    const ref = runInInjectionContext(this.injector, () => doc(this.firestore, path));
    const snap = await runInInjectionContext(this.injector, () => getDoc(ref));

    if (!snap.exists()) {
      return null;
    }

    return { id: snap.id, ...(snap.data() as any) } as any;
  }

  setDoc(path: string, data: any, options?: { merge?: boolean }) {
    const ref = runInInjectionContext(this.injector, () => doc(this.firestore, path));

    if (options) {
      return runInInjectionContext(this.injector, () => setDoc(ref, data, options as SetOptions));
    }

    return runInInjectionContext(this.injector, () => setDoc(ref, data));
  }

  updateDoc(path: string, data: any) {
    const ref = runInInjectionContext(this.injector, () => doc(this.firestore, path));
    return runInInjectionContext(this.injector, () => updateDoc(ref, data));
  }

  async addDoc<T = any>(collectionPath: string, data: T): Promise<string> {
    const colRef = runInInjectionContext(this.injector, () => collection(this.firestore, collectionPath));
    const ref = await runInInjectionContext(this.injector, () => addDoc(colRef, data as any));
    return ref.id;
  }

  deleteDoc(path: string) {
    const ref = runInInjectionContext(this.injector, () => doc(this.firestore, path));
    return runInInjectionContext(this.injector, () => deleteDoc(ref));
  }

  async list<T = any>(collectionPath: string, constraints: QueryConstraint[] = []): Promise<Array<T & { id: string }>> {
    const colRef = runInInjectionContext(this.injector, () => collection(this.firestore, collectionPath));
    const q = constraints.length
      ? runInInjectionContext(this.injector, () => query(colRef, ...constraints))
      : runInInjectionContext(this.injector, () => query(colRef));

    const snap = await runInInjectionContext(this.injector, () => getDocs(q));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
  }
}
