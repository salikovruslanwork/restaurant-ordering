import { OrderStatus } from '@restaurant/contracts';

export const ORDERS_REPOSITORY = 'ORDERS_REPOSITORY';

export const FIRST_ORDER_NUMBER = 1001;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

export const CLIENT_ID_HEADER = 'X-Client-Id';
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Placed]: [OrderStatus.Preparing, OrderStatus.Cancelled],
  [OrderStatus.Preparing]: [OrderStatus.Ready],
  [OrderStatus.Ready]: [],
  [OrderStatus.Cancelled]: []
};

export const ORDER_MESSAGES = {
  linesRequired: 'Add at least one item to your order',
  itemInvalid: 'This item is not valid',
  quantityInvalid: `The quantity must be a whole number from ${MIN_QUANTITY} to ${MAX_QUANTITY}`,
  amountInvalid: 'Enter an amount like 25 or 25.50',
  amountTooLow: 'The amount must be more than $0',
  amountTooHigh: 'The amount can’t be more than $10,000',
  itemVersionInvalid: 'The item version must be a whole number',
  openPriceInvalid: 'Say whether the customer entered this price',
  discountInvalid: 'The discount can’t be negative',
  statusInvalid: 'This order status is not valid',
  expectedVersionInvalid: 'The order version must be a whole number',
  menuChanged: 'The menu changed while you were ordering. Please check your order.',
  versionConflict: 'This order was updated by someone else.',
  invalidTransition: 'This order can no longer move to that status.',
  orderNotFound: 'This order no longer exists.'
};
