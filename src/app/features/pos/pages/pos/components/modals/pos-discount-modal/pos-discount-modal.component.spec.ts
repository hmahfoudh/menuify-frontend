import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosDiscountModalComponent } from './pos-discount-modal.component';

describe('PosDiscountModalComponent', () => {
  let component: PosDiscountModalComponent;
  let fixture: ComponentFixture<PosDiscountModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosDiscountModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosDiscountModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
