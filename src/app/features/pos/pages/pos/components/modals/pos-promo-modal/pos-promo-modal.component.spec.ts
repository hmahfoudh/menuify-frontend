import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosPromoModalComponent } from './pos-promo-modal.component';

describe('PosPromoModalComponent', () => {
  let component: PosPromoModalComponent;
  let fixture: ComponentFixture<PosPromoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosPromoModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosPromoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
