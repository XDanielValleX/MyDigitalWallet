import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';

import { ModalService } from './modal';

describe('ModalService', () => {
  let service: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ModalController,
          useValue: {
            create: async () => ({
              present: async () => { },
              onDidDismiss: async () => ({ role: 'dismiss', data: null })
            }),
            dismiss: async () => true
          }
        }
      ]
    });
    service = TestBed.inject(ModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
