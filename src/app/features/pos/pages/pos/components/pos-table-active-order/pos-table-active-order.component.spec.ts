import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosTableActiveOrderComponent } from './pos-table-active-order.component';

describe('PosTableActiveOrderComponent', () => {
  let component: PosTableActiveOrderComponent;
  let fixture: ComponentFixture<PosTableActiveOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosTableActiveOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosTableActiveOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
