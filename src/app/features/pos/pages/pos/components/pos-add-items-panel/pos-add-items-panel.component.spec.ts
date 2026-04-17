import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosAddItemsPanelComponent } from './pos-add-items-panel.component';

describe('PosAddItemsPanelComponent', () => {
  let component: PosAddItemsPanelComponent;
  let fixture: ComponentFixture<PosAddItemsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosAddItemsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosAddItemsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
