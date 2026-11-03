import { PricingKind, type Category, type MenuItem } from '@restaurant/contracts';
import { AvailabilityFilter, type ItemFilter } from '@admin/models/menu-editor.model';

import { toActiveFilter, toItemList } from './item-rows';

function item(id: string, categoryId: string, isAvailable = true): MenuItem {
  return {
    id,
    categoryId,
    name: id,
    description: '',
    pricing: { kind: PricingKind.Open },
    isAvailable,
    version: 1,
    updatedAt: '2026-11-01T00:00:00.000Z'
  };
}

const categories: Category[] = [
  { id: 'soup', name: 'Soups', sortOrder: 0, version: 1 },
  { id: 'tea', name: 'Tea', sortOrder: 1, version: 1 }
];
const items = [item('oolong', 'tea'), item('miso', 'soup'), item('sencha', 'tea', false)];
const all: ItemFilter = { categoryId: null, availability: AvailabilityFilter.All };

describe('toActiveFilter', () => {
  it('keeps a filter on an existing category and drops one on a deleted category', () => {
    const onTea = { ...all, categoryId: 'tea' };
    const onGone = { ...all, categoryId: 'gone' };

    expect(toActiveFilter(onTea, categories)).toBe(onTea);
    expect(toActiveFilter(all, categories)).toBe(all);
    expect(toActiveFilter(onGone, categories)).toEqual(all);
  });
});

describe('toItemList', () => {
  const ids = (filter: ItemFilter) =>
    toItemList(categories, items, filter, {}, []).rows.map(({ id }) => id);

  it('lists the newest items first with their category name', () => {
    const list = toItemList(categories, items, all, {}, []);

    expect(list.total).toBe(3);
    expect(list.rows.map(({ id, categoryName }) => [id, categoryName])).toEqual([
      ['sencha', 'Tea'],
      ['miso', 'Soups'],
      ['oolong', 'Tea']
    ]);
  });

  it('puts a newly added item on top, across categories', () => {
    expect(ids(all)[0]).toBe('sencha');

    const list = toItemList(categories, [...items, item('borscht', 'soup')], all, {}, []);

    expect(list.rows[0]?.id).toBe('borscht');
  });

  it('skips items of an unknown category', () => {
    const list = toItemList(categories, [...items, item('lost', 'gone')], all, {}, []);

    expect(list.total).toBe(3);
    expect(list.rows.map(({ id }) => id)).not.toContain('lost');
  });

  it('filters by category and availability, and still counts everything', () => {
    expect(ids({ ...all, categoryId: 'tea' })).toEqual(['sencha', 'oolong']);
    expect(ids({ ...all, availability: AvailabilityFilter.Available })).toEqual(['miso', 'oolong']);
    expect(ids({ categoryId: 'tea', availability: AvailabilityFilter.Unavailable })).toEqual([
      'sencha'
    ]);
    expect(toItemList(categories, items, { ...all, categoryId: 'tea' }, {}, []).total).toBe(3);
  });

  it('shows a pending availability without moving the row out of the filter', () => {
    const list = toItemList(
      categories,
      items,
      { ...all, availability: AvailabilityFilter.Available },
      { oolong: false },
      ['miso']
    );

    expect(list.rows.find(({ id }) => id === 'oolong')).toMatchObject({
      isAvailable: false,
      isSaving: true,
      isDeleting: false
    });
    expect(list.rows.find(({ id }) => id === 'miso')).toMatchObject({
      isSaving: false,
      isDeleting: true
    });
  });
});
