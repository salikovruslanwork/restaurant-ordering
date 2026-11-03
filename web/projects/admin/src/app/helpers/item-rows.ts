import type { Category, Id, MenuItem } from '@restaurant/contracts';
import type { ItemList, ItemRow } from '@admin/models/item-list.model';
import { AvailabilityFilter, type ItemFilter } from '@admin/models/menu-editor.model';

function matchesAvailability(isAvailable: boolean, filter: AvailabilityFilter): boolean {
  return (
    filter === AvailabilityFilter.All || isAvailable === (filter === AvailabilityFilter.Available)
  );
}

// A category deleted elsewhere drops out of the filter instead of leaving an empty list.
export function toActiveFilter(filter: ItemFilter, categories: Category[]): ItemFilter {
  const exists = categories.some(({ id }) => id === filter.categoryId);
  return filter.categoryId === null || exists ? filter : { ...filter, categoryId: null };
}

// Newest first: the server lists items in the order they were added, and edits keep their place.
export function toItemList(
  categories: Category[],
  items: MenuItem[],
  filter: ItemFilter,
  pendingAvailability: Record<Id, boolean>,
  deletingIds: Id[]
): ItemList {
  const categoryNames = new Map(categories.map(({ id, name }) => [id, name]));
  const deleting = new Set(deletingIds);
  const rows: ItemRow[] = [];
  let total = 0;
  for (const item of [...items].reverse()) {
    const categoryName = categoryNames.get(item.categoryId);
    if (categoryName === undefined) {
      continue;
    }
    total += 1;
    if (filter.categoryId !== null && filter.categoryId !== item.categoryId) {
      continue;
    }
    if (!matchesAvailability(item.isAvailable, filter.availability)) {
      continue;
    }
    const pending = pendingAvailability[item.id];
    rows.push({
      id: item.id,
      name: item.name,
      description: item.description,
      categoryName,
      pricing: item.pricing,
      isAvailable: pending ?? item.isAvailable,
      isSaving: pending !== undefined,
      isDeleting: deleting.has(item.id)
    });
  }
  return { rows, total };
}
