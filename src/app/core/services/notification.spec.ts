import { TestBed } from '@angular/core/testing';

import { DialogService } from './dialog';
import { ToastService } from './toast';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ToastService,
          useValue: {
            show: async () => { },
            success: async () => { },
            error: async () => { }
          }
        },
        {
          provide: DialogService,
          useValue: {
            confirm: async () => true
          }
        }
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
