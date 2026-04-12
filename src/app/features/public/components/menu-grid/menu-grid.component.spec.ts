import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuGridComponent } from './menu-grid.component';

describe('MenuGridComponent', () => {
  let component: MenuGridComponent;
  let fixture: ComponentFixture<MenuGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
