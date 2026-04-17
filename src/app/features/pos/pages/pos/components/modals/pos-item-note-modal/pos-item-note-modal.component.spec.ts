import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosItemNoteModalComponent } from './pos-item-note-modal.component';

describe('PosItemNoteModalComponent', () => {
  let component: PosItemNoteModalComponent;
  let fixture: ComponentFixture<PosItemNoteModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosItemNoteModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosItemNoteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
