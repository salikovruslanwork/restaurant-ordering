import { PricingKind } from '@restaurant/contracts';
import type { ActionMenuItem, SegmentedButtonOption } from '@shared/ui';
import { AvailabilityFilter, ItemFormField } from '@admin/models/menu-editor.model';

export const ITEM_NAME_MAX_LENGTH = 60;
export const ITEM_DESCRIPTION_MAX_LENGTH = 200;
export const ITEM_MAX_PRICE_CENTS = 1_000_000;

export const ALL_CATEGORIES = 'all';
export const ITEM_TABLE_ROW_HEIGHT = 56;
export const ITEM_CARD_ROW_HEIGHT = 72;
export const ITEM_SKELETON_ROWS = 8;
export const MENU_FRESH_MS = 2400;

export const AVAILABILITY_FILTER_OPTIONS: SegmentedButtonOption<AvailabilityFilter>[] = [
  { value: AvailabilityFilter.All, label: 'All' },
  { value: AvailabilityFilter.Available, label: 'Available' },
  { value: AvailabilityFilter.Unavailable, label: 'Unavailable' }
];

export const PRICING_OPTIONS: SegmentedButtonOption<PricingKind>[] = [
  { value: PricingKind.Fixed, label: 'Fixed price' },
  { value: PricingKind.Open, label: 'Open price' }
];

export const ITEM_EDIT_ACTION: ActionMenuItem = { label: 'Edit', icon: 'edit' };
export const ITEM_DELETE_ACTION: ActionMenuItem = {
  label: 'Delete',
  icon: 'delete',
  isDanger: true
};

export const ITEM_FIELD_ERRORS: Record<ItemFormField, Record<string, string>> = {
  [ItemFormField.Name]: {
    required: 'Enter a name',
    maxlength: `Keep the name under ${ITEM_NAME_MAX_LENGTH} characters`
  },
  [ItemFormField.Description]: {
    maxlength: `Keep the description under ${ITEM_DESCRIPTION_MAX_LENGTH} characters`
  },
  [ItemFormField.CategoryId]: { required: 'Choose a category' },
  [ItemFormField.Price]: {
    required: 'Enter a price',
    format: 'Enter a price like 12 or 12.50',
    min: 'The price must be more than $0',
    max: 'The price can’t be more than $10,000'
  }
};

// Server validation paths, mapped to the form field that shows the message.
export const ITEM_SERVER_FIELDS: Record<string, ItemFormField> = {
  name: ItemFormField.Name,
  description: ItemFormField.Description,
  categoryId: ItemFormField.CategoryId,
  pricing: ItemFormField.Price,
  'pricing.price': ItemFormField.Price
};

export const ITEMS_LOAD_ERROR = 'We couldn’t load items. Check your connection and try again.';
export const ITEM_SAVE_CONNECTION_ERROR =
  'We couldn’t save the item. Check your connection and try again — your changes are kept.';
export const ITEM_SAVE_OFFLINE_NOTE =
  'You’re offline. Your changes are kept — save again when you’re back.';
export const ITEM_DELETE_TEXT =
  'It will disappear from the menu right away. Orders that were already placed keep it.';
export const ITEM_OPEN_PRICE_NOTE =
  'No fixed price — customers see “Set your price” and enter the amount when they order.';
