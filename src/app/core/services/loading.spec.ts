import { TestBed } from '@angular/core/testing';
import { LoadingController } from '@ionic/angular';

import { LoadingService } from './loading';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LoadingController,
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
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
