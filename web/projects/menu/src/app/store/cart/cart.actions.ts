import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Cents, MenuItem } from '@restaurant/contracts';
import type { CartState } from '@menu/models/cart.model';

export const cartActions = createActionGroup({
  source: 'Cart',
  events: {
    Restored: props<{ state: CartState }>(),
    'Item Added': props<{ item: MenuItem }>(),
    'Open Price Item Added': props<{ item: MenuItem; price: Cents; quantity: number }>(),
    'Quantity Changed': props<{ key: string; quantity: number }>(),
    'Line Removed': props<{ key: string }>(),
    'Discount Applied': props<{ discount: Cents }>(),
    'Discount Removed': emptyProps(),
    'Open Requested': emptyProps()
  }
});
