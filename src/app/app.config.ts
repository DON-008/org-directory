import { ApplicationConfig, provideBrowserGlobalErrorListeners , provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { I18nService } from './i18n/i18n.service'; 
import { mockApiInterceptor } from './mock/mock-api.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),                                    
    provideAppInitializer(() => inject(I18nService).load()),
    provideHttpClient(withInterceptors([mockApiInterceptor])),
  ]
};
