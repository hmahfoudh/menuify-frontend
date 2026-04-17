import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosOpenShiftModalComponent } from './pos-open-shift-modal.component';

describe('PosOpenShiftModalComponent', () => {
  let component: PosOpenShiftModalComponent;
  let fixture: ComponentFixture<PosOpenShiftModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosOpenShiftModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosOpenShiftModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
