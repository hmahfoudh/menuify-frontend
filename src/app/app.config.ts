import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { initApp } from './core/initializers/app-initializer';
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";


export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, tenantInterceptor])),
        provideAnimationsAsync(),
        provideTranslateService({
            loader: provideTranslateHttpLoader({ prefix: './assets/i18n/',suffix: '.json' }),
            fallbackLang: 'ar',
            lang: 'fr'
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: initApp,
            multi: true,
        },
    ],
};
