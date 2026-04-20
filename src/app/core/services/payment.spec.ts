import { TestBed } from '@angular/core/testing';

import { FirestoreService } from './firestore';
import { PaymentService } from './payment';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirestoreService,
          useValue: {
            addDoc: async () => 'mock-id',
            updateDoc: async () => { },
            setDoc: async () => { },
            list: async () => []
          }
        }
      ]
    });
    service = TestBed.inject(PaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
