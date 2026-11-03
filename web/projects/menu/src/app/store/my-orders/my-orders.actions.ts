import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Id, Order, OrdersSnapshot } from '@restaurant/contracts';

export const myOrdersActions = createActionGroup({
  source: 'My Orders',
  events: {
    Load: emptyProps(),
    'Load Succeeded': props<{ snapshot: OrdersSnapshot }>(),
    'Load Failed': props<{ message: string }>(),
    'Statuses Changed': props<{ orders: Order[] }>(),
    'Fresh Ended': props<{ ids: Id[] }>()
  }
});
