import type { MenuItem } from '@restaurant/contracts';

export interface MenuGridLayout {
  columns: number;
  rowHeight: number;
}

export interface MenuGridRow {
  index: number;
  items: MenuItem[];
}
