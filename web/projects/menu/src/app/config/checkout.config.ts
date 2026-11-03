import { CheckoutBlock, CheckoutErrorKind } from '@menu/models/checkout.model';

export const CHECKOUT_STORAGE_KEY = 'restaurant.checkout';

export const CHECKOUT_BLOCK_HINTS: Record<CheckoutBlock, string> = {
  [CheckoutBlock.Empty]: 'Your cart is empty',
  [CheckoutBlock.BlockedLines]: 'Remove unavailable items to continue'
};

export const CHECKOUT_ERRORS: Record<CheckoutErrorKind, string> = {
  [CheckoutErrorKind.Connection]:
    'We couldn’t confirm your order — the connection dropped. Your cart is saved, and trying again won’t place it twice.',
  [CheckoutErrorKind.Server]:
    'Something went wrong on our side. Your cart is saved, so you can simply try again.'
};

export const CHECKOUT_SUCCESS_TEXT =
  'Thank you! We’ve got your order and the kitchen will start on it shortly.';
export const CHECKOUT_CONFLICT_TEXT = 'Some items changed while you were ordering. Please review.';
export const CHECKOUT_EMPTY_AFTER_CONFLICT =
  'Nothing is left in your order. Go back to the menu to pick something else.';
