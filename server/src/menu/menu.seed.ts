import { PricingKind, type Category, type Id, type MenuItem } from '@restaurant/contracts';

import {
  SEED_DISHES_BY_CATEGORY,
  SEED_ITEMS_PER_CATEGORY,
  SEED_OPEN_PRICE_EVERY,
  SEED_UNAVAILABLE_EVERY
} from './menu-seed.config.js';

export interface MenuSeed {
  categories: Category[];
  items: MenuItem[];
}

// Stable ids keep carts saved in localStorage valid across server restarts.
function seedId(prefix: string, index: number): Id {
  return `00000000-0000-4000-8000-${prefix}${String(index).padStart(11, '0')}`;
}

function createItem(
  categoryId: Id,
  categoryName: string,
  name: string,
  index: number,
  now: string
): MenuItem {
  return {
    id: seedId('1', index),
    categoryId,
    name,
    description: `${name} from our ${categoryName.toLowerCase()} selection.`,
    pricing:
      index % SEED_OPEN_PRICE_EVERY === 0
        ? { kind: PricingKind.Open }
        : { kind: PricingKind.Fixed, price: 400 + (index % 40) * 50 },
    isAvailable: index % SEED_UNAVAILABLE_EVERY !== 1,
    version: 1,
    updatedAt: now
  };
}

export function createMenuSeed(now = new Date().toISOString()): MenuSeed {
  const menu = Object.entries(SEED_DISHES_BY_CATEGORY);
  const categories = menu.map(([name], index) => ({
    id: seedId('0', index),
    name,
    sortOrder: index,
    version: 1
  }));
  const items = categories.flatMap((category, categoryIndex) =>
    (menu[categoryIndex]?.[1] ?? []).map((dish, position) =>
      createItem(
        category.id,
        category.name,
        dish,
        categoryIndex * SEED_ITEMS_PER_CATEGORY + position,
        now
      )
    )
  );

  return { categories, items };
}
