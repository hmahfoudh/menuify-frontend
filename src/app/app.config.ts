import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { initApp } from './core/initializers/app-initializer';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withFetch(),withInterceptors([jwtInterceptor, tenantInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: initApp,
            multi: true,
        },
    ],
};
