import { Observable } from 'rxjs';

import type { Category, Id, MenuItem } from '@restaurant/contracts';
import {
  MENU_CARD_BODY_HEIGHT,
  MENU_CARD_MIN_WIDTH,
  MENU_CARD_MOBILE_HEIGHT,
  MENU_GRID_GAP,
  MENU_GRID_MOBILE_GAP,
  MENU_IMAGE_RATIO
} from '@menu/config/menu.config';
import type { MenuGridLayout, MenuGridRow } from '@menu/models/menu-grid.model';

// Mirrors `repeat(auto-fill, minmax(232px, 1fr))`: a card's image is 4:3 of its width, so the
// row height follows the container width.
export function getGridLayout(width: number, isMobile: boolean): MenuGridLayout {
  if (isMobile) {
    return { columns: 1, rowHeight: MENU_CARD_MOBILE_HEIGHT + MENU_GRID_MOBILE_GAP };
  }
  const columns = Math.max(
    1,
    Math.floor((width + MENU_GRID_GAP) / (MENU_CARD_MIN_WIDTH + MENU_GRID_GAP))
  );
  const cardWidth = (width - MENU_GRID_GAP * (columns - 1)) / columns;
  const rowHeight =
    Math.round(cardWidth * MENU_IMAGE_RATIO) + MENU_CARD_BODY_HEIGHT + MENU_GRID_GAP;
  return { columns, rowHeight };
}

export function toGridRows(items: MenuItem[], columns: number): MenuGridRow[] {
  const rows: MenuGridRow[] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push({ index: rows.length, items: items.slice(start, start + columns) });
  }
  return rows;
}

// "All" lists dishes in menu order: categories by sort order, then items as the server lists them.
export function getVisibleItems(
  categories: Category[],
  itemsByCategory: Map<Id, MenuItem[]>,
  categoryId: Id | null
): MenuItem[] {
  if (categoryId !== null) {
    return itemsByCategory.get(categoryId) ?? [];
  }
  return categories.flatMap(({ id }) => itemsByCategory.get(id) ?? []);
}

export function observeWidth(element: HTMLElement): Observable<number> {
  return new Observable<number>((subscriber) => {
    subscriber.next(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        subscriber.next(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
}
