import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomePopupComponent } from './welcome-popup.component';

describe('WelcomePopupComponent', () => {
  let component: WelcomePopupComponent;
  let fixture: ComponentFixture<WelcomePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomePopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
