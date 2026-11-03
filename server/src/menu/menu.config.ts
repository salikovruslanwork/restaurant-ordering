export const MENU_REPOSITORY = 'MENU_REPOSITORY';

export const MAX_CATEGORY_NAME_LENGTH = 30;
export const MAX_ITEM_NAME_LENGTH = 60;
export const MAX_ITEM_DESCRIPTION_LENGTH = 200;
export const MAX_PRICE_CENTS = 1_000_000;

export const MENU_MESSAGES = {
  categoryNameRequired: 'Enter a category name',
  categoryNameTooLong: `Keep the name under ${MAX_CATEGORY_NAME_LENGTH} characters`,
  categoryNameTaken: 'A category with this name already exists',
  categoryNotFound: 'This category no longer exists.',
  sortOrderInvalid: 'The position must be a whole number, 0 or more',
  categoryRequired: 'Choose a category',
  itemNameRequired: 'Enter a name',
  itemNameTooLong: `Keep the name under ${MAX_ITEM_NAME_LENGTH} characters`,
  descriptionTooLong: `Keep the description under ${MAX_ITEM_DESCRIPTION_LENGTH} characters`,
  pricingRequired: 'Choose a price type',
  priceInvalid: 'Enter a price like 12 or 12.50',
  priceTooLow: 'The price must be more than $0',
  priceTooHigh: 'The price can’t be more than $10,000',
  availabilityInvalid: 'Choose whether the item is available',
  itemNotFound: 'This item no longer exists.'
};
