import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { BlogService } from './blog.service';
import { BlogPostDetail } from '../models/blog.model';

export const blogPostResolver: ResolveFn<BlogPostDetail> = (route) => {
  const blogService = inject(BlogService);
  const router      = inject(Router);
  const slug        = route.paramMap.get('slug')!;

  return blogService.getPostBySlug(slug).pipe(
    catchError(() => {
      router.navigate(['/blog']);
      return EMPTY;
    })
  );
};