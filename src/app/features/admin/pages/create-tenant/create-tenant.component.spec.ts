import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTenantComponent } from './create-tenant.component';

describe('CreateTenantComponent', () => {
  let component: CreateTenantComponent;
  let fixture: ComponentFixture<CreateTenantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTenantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTenantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
