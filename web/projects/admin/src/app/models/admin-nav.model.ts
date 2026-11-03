export enum AdminRoute {
  Orders = 'orders',
  Items = 'items',
  Categories = 'categories'
}

export interface AdminNavItem {
  route: AdminRoute;
  icon: string;
  label: string;
}
