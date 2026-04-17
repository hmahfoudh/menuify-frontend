import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosOrderColumnComponent } from './pos-order-column.component';

describe('PosOrderColumnComponent', () => {
  let component: PosOrderColumnComponent;
  let fixture: ComponentFixture<PosOrderColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosOrderColumnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosOrderColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
