// core/interceptors/tenant.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject }            from '@angular/core';
import { AuthService }       from '../services/auth.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth     = inject(AuthService);
  const tenant   = auth.currentTenant();
  const id = tenant?.id;

  if (id) {
    req = req.clone({
      setHeaders: { 'X-TenantID': id }
    });
  }

  return next(req);
};