import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImpersonationBannerComponent } from './impersonation-banner.component';

describe('ImpersonationBannerComponent', () => {
  let component: ImpersonationBannerComponent;
  let fixture: ComponentFixture<ImpersonationBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImpersonationBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImpersonationBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
