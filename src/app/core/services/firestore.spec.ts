import { TestBed } from '@angular/core/testing';
import { Firestore as AngularFirestore } from '@angular/fire/firestore';

import { FirestoreService } from './firestore';

describe('FirestoreService', () => {
  let service: FirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFirestore, useValue: {} }
      ]
    });
    service = TestBed.inject(FirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
