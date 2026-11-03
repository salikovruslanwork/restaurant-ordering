import { PricingKind, type MenuItem } from '@restaurant/contracts';
import { LoadStatus, menuActions, menuFeature } from '@shared/data-access';
import { AvailabilityFilter } from '@admin/models/menu-editor.model';

import { menuEditorFeature } from './menu-editor.reducer';
import { selectCategoryRows, selectItemList } from './menu-editor.selectors';

function item(id: string, categoryId: string): MenuItem {
  return {
    id,
    categoryId,
    name: id,
    description: '',
    pricing: { kind: PricingKind.Open },
    isAvailable: true,
    version: 1,
    updatedAt: '2026-11-01T00:00:00.000Z'
  };
}

describe('menuEditor selectors', () => {
  it('lists categories in menu order with their item counts', () => {
    const menu = menuFeature.reducer(
      undefined,
      menuActions.loadSucceeded({
        snapshot: {
          categories: [
            { id: 'tea', name: 'Tea', sortOrder: 1, version: 1 },
            { id: 'soup', name: 'Soup', sortOrder: 0, version: 1 }
          ],
          items: [item('oolong', 'tea'), item('sencha', 'tea')],
          seq: 1
        }
      })
    );
    expect(menu.loadStatus).toBe(LoadStatus.Loaded);

    expect(selectCategoryRows({ menu })).toEqual([
      { id: 'soup', name: 'Soup', itemCount: 0 },
      { id: 'tea', name: 'Tea', itemCount: 2 }
    ]);
  });

  it('lists filtered items with pending state from the editor', () => {
    const menu = menuFeature.reducer(
      undefined,
      menuActions.loadSucceeded({
        snapshot: {
          categories: [{ id: 'tea', name: 'Tea', sortOrder: 0, version: 1 }],
          items: [item('oolong', 'tea'), { ...item('sencha', 'tea'), isAvailable: false }],
          seq: 1
        }
      })
    );
    const menuEditor = {
      ...menuEditorFeature.reducer(undefined, { type: 'init' }),
      itemFilter: { categoryId: null, availability: AvailabilityFilter.Available },
      pendingAvailability: { oolong: false }
    };

    const list = selectItemList({ menu, menuEditor });

    expect(list.total).toBe(2);
    expect(list.rows).toEqual([
      expect.objectContaining({ id: 'oolong', isSaving: true, isAvailable: false })
    ]);
  });
});
