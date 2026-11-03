import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { provideDataAccess, RealtimeStream } from '@shared/data-access';

import { routes } from './app.routes';
import { CartEffects } from './store/cart/cart.effects';
import { cartFeature } from './store/cart/cart.reducer';
import { CheckoutEffects } from './store/checkout/checkout.effects';
import { checkoutFeature } from './store/checkout/checkout.reducer';
import { MyOrdersEffects } from './store/my-orders/my-orders.effects';
import { myOrdersFeature } from './store/my-orders/my-orders.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDataAccess(RealtimeStream.Customer),
    provideState(cartFeature),
    provideState(checkoutFeature),
    provideState(myOrdersFeature),
    provideEffects(CartEffects, CheckoutEffects, MyOrdersEffects)
  ]
};
