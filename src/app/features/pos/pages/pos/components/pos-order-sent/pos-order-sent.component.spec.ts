import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosOrderSentComponent } from './pos-order-sent.component';

describe('PosOrderSentComponent', () => {
  let component: PosOrderSentComponent;
  let fixture: ComponentFixture<PosOrderSentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosOrderSentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosOrderSentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
