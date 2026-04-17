import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosCartPanelComponent } from './pos-cart-panel.component';

describe('PosCartPanelComponent', () => {
  let component: PosCartPanelComponent;
  let fixture: ComponentFixture<PosCartPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCartPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosCartPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
