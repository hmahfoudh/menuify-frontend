import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZReportComponent } from './z-report.component';

describe('ZReportComponent', () => {
  let component: ZReportComponent;
  let fixture: ComponentFixture<ZReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
