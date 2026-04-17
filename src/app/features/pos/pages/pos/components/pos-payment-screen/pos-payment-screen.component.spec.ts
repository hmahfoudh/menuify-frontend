import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosPaymentScreenComponent } from './pos-payment-screen.component';

describe('PosPaymentScreenComponent', () => {
  let component: PosPaymentScreenComponent;
  let fixture: ComponentFixture<PosPaymentScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosPaymentScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosPaymentScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
