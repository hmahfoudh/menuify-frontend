import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosTopbarComponent } from './pos-topbar.component';

describe('PosTopbarComponent', () => {
  let component: PosTopbarComponent;
  let fixture: ComponentFixture<PosTopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosTopbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
