import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosMenuColumnComponent } from './pos-menu-column.component';

describe('PosMenuColumnComponent', () => {
  let component: PosMenuColumnComponent;
  let fixture: ComponentFixture<PosMenuColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosMenuColumnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosMenuColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
