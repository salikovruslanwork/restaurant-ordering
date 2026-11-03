export const CART_STORAGE_KEY = 'restaurant.cart.v1';
export const MAX_QUANTITY = 99;
export const MAX_OPEN_PRICE_CENTS = 1_000_000;

export const OPEN_PRICE_ERRORS: Record<string, string> = {
  required: 'Enter the amount you’d like to pay',
  format: 'Enter an amount like 25 or 25.50',
  min: 'The amount must be more than $0',
  max: 'The amount can’t be more than $10,000'
};
export const OPEN_PRICE_HINT = 'From $0.01 up to $10,000';
export const OPEN_PRICE_NOTE = 'This item has no fixed price — enter the amount you’d like to pay.';

export const DISCOUNT_ERRORS: Record<string, string> = {
  required: 'Enter a discount amount',
  format: 'Enter an amount like 5 or 5.50',
  min: 'The discount must be more than $0'
};

export const CART_CHANGED_NOTICE = 'Some items in your cart changed — please check your cart';
export const CART_CHANGED_ACTION = 'View cart';
