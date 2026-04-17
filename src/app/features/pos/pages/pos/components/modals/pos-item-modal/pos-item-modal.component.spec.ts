import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosItemModalComponent } from './pos-item-modal.component';

describe('PosItemModalComponent', () => {
  let component: PosItemModalComponent;
  let fixture: ComponentFixture<PosItemModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosItemModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosItemModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
