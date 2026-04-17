import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosReceiptComponent } from './pos-receipt.component';

describe('PosReceiptComponent', () => {
  let component: PosReceiptComponent;
  let fixture: ComponentFixture<PosReceiptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosReceiptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosReceiptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
