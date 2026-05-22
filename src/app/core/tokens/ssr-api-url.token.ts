import { InjectionToken } from '@angular/core';

export const SSR_API_URL = new InjectionToken<string>('SSR_API_URL', {
  factory: () => ''
});