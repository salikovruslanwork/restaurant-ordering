import { Routes } from '@angular/router';

import { provideEffects } from '@ngrx/effects';

import { ADMIN_TITLE_SUFFIX } from '@admin/config/admin-nav.config';
import { AdminRoute } from '@admin/models/admin-nav.model';
import { OrderStatusUiEffects } from '@admin/store/admin-orders/order-status-ui.effects';
import { OrderStatusEffects } from '@admin/store/admin-orders/order-status.effects';

export const ORDERS_ROUTES: Routes = [
  {
    path: AdminRoute.Orders,
    title: `Orders · ${ADMIN_TITLE_SUFFIX}`,
    providers: [provideEffects(OrderStatusEffects, OrderStatusUiEffects)],
    loadComponent: () =>
      import('@admin/components/pages/orders-page/orders-page.component').then(
        (m) => m.OrdersPageComponent
      )
  }
];
