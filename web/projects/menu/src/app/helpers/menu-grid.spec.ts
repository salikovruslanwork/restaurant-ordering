import { firstValueFrom } from 'rxjs';

import { makeCategory, makeItem } from '@menu/testing/menu';

import { getGridLayout, getVisibleItems, observeWidth, toGridRows } from './menu-grid';

describe('menu grid helpers', () => {
  it.each([
    [1000, 4, 349],
    [740, 3, 347],
    [500, 2, 352],
    [200, 1, 320]
  ])('fits %ipx into %i columns with a %ipx row', (width, columns, rowHeight) => {
    expect(getGridLayout(width, false)).toEqual({ columns, rowHeight });
  });

  it('uses one fixed-height column on mobile', () => {
    expect(getGridLayout(375, true)).toEqual({ columns: 1, rowHeight: 160 });
  });

  it('splits items into rows', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => makeItem({ id }));

    const rows = toGridRows(items, 2);

    expect(rows.map(({ index, items: row }) => [index, row.map(({ id }) => id)])).toEqual([
      [0, ['a', 'b']],
      [1, ['c', 'd']],
      [2, ['e']]
    ]);
  });

  it('lists all dishes in menu order, or one category', () => {
    const categories = [makeCategory('soup', 'Soups', 0), makeCategory('tea', 'Tea', 1)];
    const groups = new Map([
      ['tea', [makeItem({ id: 'oolong', categoryId: 'tea' })]],
      ['soup', [makeItem({ id: 'miso' })]]
    ]);
    const ids = (categoryId: string | null) =>
      getVisibleItems(categories, groups, categoryId).map(({ id }) => id);

    expect(ids(null)).toEqual(['miso', 'oolong']);
    expect(ids('tea')).toEqual(['oolong']);
    expect(ids('gone')).toEqual([]);
  });

  it('reports the current width even without ResizeObserver', async () => {
    const element = document.createElement('div');

    expect(await firstValueFrom(observeWidth(element))).toBe(0);
  });
});
