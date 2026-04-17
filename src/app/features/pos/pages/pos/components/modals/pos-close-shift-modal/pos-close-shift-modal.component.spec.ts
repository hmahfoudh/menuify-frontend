import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosCloseShiftModalComponent } from './pos-close-shift-modal.component';

describe('PosCloseShiftModalComponent', () => {
  let component: PosCloseShiftModalComponent;
  let fixture: ComponentFixture<PosCloseShiftModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCloseShiftModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosCloseShiftModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
