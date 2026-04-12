import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosedBannerComponent } from './closed-banner.component';

describe('ClosedBannerComponent', () => {
  let component: ClosedBannerComponent;
  let fixture: ComponentFixture<ClosedBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClosedBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClosedBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
