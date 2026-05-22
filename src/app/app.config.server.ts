import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering }                    from '@angular/platform-server';
import { appConfig }                                 from './app.config';
import { provideHttpClient, withFetch } from '@angular/common/http';

/**
 * SSR-specific config.
 * SubdomainService now reads the hostname from DOCUMENT which Angular
 * populates correctly in both browser and SSR contexts — no custom
 * request token needed.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideHttpClient(withFetch()),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);