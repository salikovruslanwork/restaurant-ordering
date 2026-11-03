import { createSelector } from '@ngrx/store';

import type { Category, Id, MenuItem } from '@restaurant/contracts';
import { menuFeature } from '@shared/data-access';
import { toActiveFilter, toItemList } from '@admin/helpers/item-rows';
import type { CategoryRow } from '@admin/models/category-list.model';

import { menuEditorFeature } from './menu-editor.reducer';

function toRows(categories: Category[], itemsByCategory: Map<Id, MenuItem[]>): CategoryRow[] {
  return categories.map(({ id, name }) => ({
    id,
    name,
    itemCount: itemsByCategory.get(id)?.length ?? 0
  }));
}

export const selectCategoryRows = createSelector(
  menuFeature.selectAllCategories,
  menuFeature.selectItemsByCategory,
  toRows
);

export const selectActiveItemFilter = createSelector(
  menuEditorFeature.selectItemFilter,
  menuFeature.selectAllCategories,
  toActiveFilter
);

export const selectItemList = createSelector(
  menuFeature.selectAllCategories,
  menuFeature.selectAllItems,
  selectActiveItemFilter,
  menuEditorFeature.selectPendingAvailability,
  menuEditorFeature.selectDeletingItemIds,
  toItemList
);
