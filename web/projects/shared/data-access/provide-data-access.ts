import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';

import { REALTIME_STREAM } from './config/realtime.config';
import { apiInterceptor } from './interceptors/api.interceptor';
import { clientIdInterceptor } from './interceptors/client-id.interceptor';
import type { RealtimeStream } from './models/realtime.model';
import { ConnectionEffects } from './store/connection/connection.effects';
import { connectionFeature } from './store/connection/connection.reducer';
import { MenuEffects } from './store/menu/menu.effects';
import { menuFeature } from './store/menu/menu.reducer';
import { RealtimeEffects } from './store/realtime/realtime.effects';

export function provideDataAccess(stream: RealtimeStream): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([clientIdInterceptor, apiInterceptor])),
    provideStore(),
    provideState(menuFeature),
    provideState(connectionFeature),
    provideEffects(ConnectionEffects, RealtimeEffects, MenuEffects),
    { provide: REALTIME_STREAM, useValue: stream }
  ]);
}
