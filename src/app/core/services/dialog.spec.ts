import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';

import { DialogService } from './dialog';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AlertController,
          useValue: {
            create: async () => ({
              present: async () => { },
              onDidDismiss: async () => ({ role: 'ok' })
            })
          }
        }
      ]
    });
    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
