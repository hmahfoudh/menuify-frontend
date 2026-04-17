import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosZReportModalComponent } from './pos-z-report-modal.component';

describe('PosZReportModalComponent', () => {
  let component: PosZReportModalComponent;
  let fixture: ComponentFixture<PosZReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosZReportModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosZReportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
