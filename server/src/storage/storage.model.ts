import type { Category, MenuItem, Order } from '@restaurant/contracts';

export interface StoredData {
  categories: Category[];
  items: MenuItem[];
  orders: Order[];
}
