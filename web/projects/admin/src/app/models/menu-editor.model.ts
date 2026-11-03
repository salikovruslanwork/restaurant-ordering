import type { Id } from '@restaurant/contracts';

export enum MoveDirection {
  Up = 'up',
  Down = 'down'
}

export interface CategoryEdit {
  id: Id | null;
  isSaving: boolean;
  error: string | null;
}

export enum AvailabilityFilter {
  All = 'all',
  Available = 'available',
  Unavailable = 'unavailable'
}

export interface ItemFilter {
  categoryId: Id | null;
  availability: AvailabilityFilter;
}

export enum ItemFormField {
  Name = 'name',
  Description = 'description',
  CategoryId = 'categoryId',
  Price = 'price'
}

export interface ItemEdit {
  id: Id | null;
  isSaving: boolean;
  formError: string | null;
  fieldErrors: Partial<Record<ItemFormField, string>>;
}

export interface MenuEditorState {
  categoryEdit: CategoryEdit | null;
  busyCategoryIds: Id[];
  itemFilter: ItemFilter;
  itemEdit: ItemEdit | null;
  pendingAvailability: Record<Id, boolean>;
  deletingItemIds: Id[];
  freshIds: Id[];
}
