import { Routes } from '@angular/router';

import { provideEffects } from '@ngrx/effects';

import { MenuPageComponent } from '@menu/components/pages/menu-page/menu-page.component';
import { MENU_PAGE_TITLE } from '@menu/config/menu.config';
import { MY_ORDERS_PAGE_TITLE } from '@menu/config/my-orders.config';
import { CartUiEffects } from '@menu/store/cart/cart-ui.effects';
import { CheckoutUiEffects } from '@menu/store/checkout/checkout-ui.effects';
import { MyOrdersUiEffects } from '@menu/store/my-orders/my-orders-ui.effects';

export const MENU_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEffects(CartUiEffects, CheckoutUiEffects, MyOrdersUiEffects)],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: MENU_PAGE_TITLE,
        component: MenuPageComponent
      },
      {
        path: 'orders',
        title: MY_ORDERS_PAGE_TITLE,
        loadComponent: () =>
          import('@menu/components/pages/my-orders-page/my-orders-page.component').then(
            (m) => m.MyOrdersPageComponent
          )
      }
    ]
  }
];
