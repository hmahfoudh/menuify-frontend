import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering }                    from '@angular/platform-server';
import { appConfig }                                 from './app.config';

/**
 * SSR-specific config.
 * SubdomainService now reads the hostname from DOCUMENT which Angular
 * populates correctly in both browser and SSR contexts — no custom
 * request token needed.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);