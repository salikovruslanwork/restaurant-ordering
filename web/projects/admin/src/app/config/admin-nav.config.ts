import { AdminRoute, type AdminNavItem } from '@admin/models/admin-nav.model';

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { route: AdminRoute.Orders, icon: 'receipt_long', label: 'Orders' },
  { route: AdminRoute.Items, icon: 'restaurant_menu', label: 'Items' },
  { route: AdminRoute.Categories, icon: 'category', label: 'Categories' }
];

export const ADMIN_DEFAULT_ROUTE = AdminRoute.Orders;
export const ADMIN_TITLE_SUFFIX = 'Tea House Admin';
