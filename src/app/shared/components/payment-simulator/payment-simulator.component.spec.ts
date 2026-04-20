import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PaymentSimulatorComponent } from './payment-simulator.component';
import { PaymentService } from '../../../core/services/payment';
import { NotificationService } from '../../../core/services/notification';
import { UserService } from '../../../core/services/user';
import { HttpService } from '../../../core/services/http';

describe('PaymentSimulatorComponent', () => {
  let component: PaymentSimulatorComponent;
  let fixture: ComponentFixture<PaymentSimulatorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PaymentSimulatorComponent ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: PaymentService, useValue: { process: async () => 'mock-id' } },
        { provide: NotificationService, useValue: { info: async () => { }, error: async () => { } } },
        { provide: UserService, useValue: { ensurePushToken: async () => null } },
        {
          provide: HttpService,
          useValue: {
            sendPushNotificationIfConfigured: async () => false,
            getStoredNotificationsJwt: () => null,
            getStoredNotificationsJwtEmail: () => null,
            getNotificationsCredentialsStatus: async () => null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
