import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { provideDataAccess, RealtimeStream } from '@shared/data-access';

import { routes } from './app.routes';
import { AdminOrdersEffects } from './store/admin-orders/admin-orders.effects';
import { adminOrdersFeature } from './store/admin-orders/admin-orders.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDataAccess(RealtimeStream.Admin),
    provideState(adminOrdersFeature),
    provideEffects(AdminOrdersEffects)
  ]
};
