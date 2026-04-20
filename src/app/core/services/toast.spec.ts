import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ToastController,
          useValue: {
            create: async () => ({
              present: async () => { },
              dismiss: async () => { },
              onDidDismiss: async () => ({})
            })
          }
        }
      ]
    });
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
