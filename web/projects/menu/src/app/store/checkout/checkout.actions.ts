import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { CartChange, Order } from '@restaurant/contracts';
import type {
  CheckoutAttempt,
  CheckoutChange,
  CheckoutErrorKind
} from '@menu/models/checkout.model';

export const checkoutActions = createActionGroup({
  source: 'Checkout',
  events: {
    Restored: props<{ attempt: CheckoutAttempt | null }>(),
    Opened: emptyProps(),
    Closed: emptyProps(),
    'Place Order': emptyProps(),
    'Attempt Started': props<{ attempt: CheckoutAttempt }>(),
    'Order Placed': props<{ order: Order }>(),
    'Menu Changed': props<{ changes: CartChange[]; described: CheckoutChange[] }>(),
    Failed: props<{ kind: CheckoutErrorKind }>()
  }
});
