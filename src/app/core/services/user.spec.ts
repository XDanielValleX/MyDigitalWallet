import { TestBed } from '@angular/core/testing';

import { FirestoreService } from './firestore';
import { UserService } from './user';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirestoreService,
          useValue: {
            getDoc: async () => null,
            setDoc: async () => { }
          }
        }
      ]
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
