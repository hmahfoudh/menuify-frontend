import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosTablesColumnComponent } from './pos-tables-column.component';

describe('PosTablesColumnComponent', () => {
  let component: PosTablesColumnComponent;
  let fixture: ComponentFixture<PosTablesColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosTablesColumnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosTablesColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
