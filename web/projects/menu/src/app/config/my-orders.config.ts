import { OrderStatus } from '@restaurant/contracts';

export const MY_ORDERS_URL = '/orders';
export const MY_ORDERS_PAGE_TITLE = 'My orders · Tea House';
export const MY_ORDERS_LOAD_ERROR =
  'We couldn’t load your orders. Check your connection and try again.';
export const MY_ORDERS_SKELETON_CARDS = 3;
export const ORDER_FRESH_MS = 2400;

export const ORDER_PROGRESS_STEPS = [OrderStatus.Placed, OrderStatus.Preparing, OrderStatus.Ready];
