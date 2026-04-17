import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosRefundModalComponent } from './pos-refund-modal.component';

describe('PosRefundModalComponent', () => {
  let component: PosRefundModalComponent;
  let fixture: ComponentFixture<PosRefundModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosRefundModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosRefundModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
