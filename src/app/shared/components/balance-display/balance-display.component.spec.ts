import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BalanceDisplayComponent } from './balance-display.component';
import { UserService } from '../../../core/services/user';
import { FirestoreService } from '../../../core/services/firestore';

describe('BalanceDisplayComponent', () => {
  let component: BalanceDisplayComponent;
  let fixture: ComponentFixture<BalanceDisplayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BalanceDisplayComponent ],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: FirestoreService,
          useValue: {
            getDoc: async () => null,
            setDoc: async () => { }
          }
        },
        UserService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
