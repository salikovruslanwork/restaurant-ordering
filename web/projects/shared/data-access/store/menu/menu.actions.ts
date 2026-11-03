import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Category, Id, MenuItem, MenuSnapshot } from '@restaurant/contracts';

export const menuActions = createActionGroup({
  source: 'Menu',
  events: {
    Load: emptyProps(),
    'Load Succeeded': props<{ snapshot: MenuSnapshot }>(),
    'Load Failed': props<{ message: string }>(),
    'Category Saved': props<{ category: Category }>(),
    'Category Removed': props<{ id: Id }>(),
    'Item Saved': props<{ item: MenuItem }>(),
    'Item Removed': props<{ id: Id }>()
  }
});
