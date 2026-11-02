import { ApplicationConfig, provideBrowserGlobalErrorListeners , provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { I18nService } from './i18n/i18n.service'; 

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),                                      // add
    provideAppInitializer(() => inject(I18nService).load()),
  ]
};
