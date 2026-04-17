import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosCashMovementModalComponent } from './pos-cash-movement-modal.component';

describe('PosCashMovementModalComponent', () => {
  let component: PosCashMovementModalComponent;
  let fixture: ComponentFixture<PosCashMovementModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCashMovementModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosCashMovementModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
