import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogAdminEditorComponent } from './blog-admin-editor.component';

describe('BlogAdminEditorComponent', () => {
  let component: BlogAdminEditorComponent;
  let fixture: ComponentFixture<BlogAdminEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogAdminEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlogAdminEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
