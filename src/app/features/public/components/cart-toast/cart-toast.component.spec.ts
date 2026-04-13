import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartToastComponent } from './cart-toast.component';

describe('CartToastComponent', () => {
  let component: CartToastComponent;
  let fixture: ComponentFixture<CartToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartToastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CartToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
