import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Id, Order, OrdersSnapshot, OrderStatus } from '@restaurant/contracts';

export const adminOrdersActions = createActionGroup({
  source: 'Admin Orders',
  events: {
    Load: emptyProps(),
    'Load Succeeded': props<{ snapshot: OrdersSnapshot }>(),
    'Load Failed': props<{ message: string }>(),
    'Filter By Status': props<{ status: OrderStatus | null }>(),
    'Change Status': props<{ order: Order; target: OrderStatus }>(),
    'Status Changed': props<{ order: Order }>(),
    'Status Conflict': props<{ order: Order; latest: Order | null }>(),
    'Status Change Failed': props<{ order: Order; target: OrderStatus; error: string }>(),
    'Fresh Ended': props<{ ids: Id[] }>()
  }
});
