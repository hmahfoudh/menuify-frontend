import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogAdminListComponent } from './blog-admin-list.component';

describe('BlogAdminListComponent', () => {
  let component: BlogAdminListComponent;
  let fixture: ComponentFixture<BlogAdminListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogAdminListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlogAdminListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
