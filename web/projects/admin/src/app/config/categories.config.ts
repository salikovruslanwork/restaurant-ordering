export const CATEGORY_NAME_MAX_LENGTH = 30;
export const NEW_CATEGORY_KEY = 'new';
export const CATEGORY_SKELETON_ROWS = 8;

export const CATEGORY_NAME_ERRORS: Record<string, string> = {
  required: 'Enter a category name',
  maxlength: `Keep the name under ${CATEGORY_NAME_MAX_LENGTH} characters`,
  taken: 'A category with this name already exists'
};

export const CATEGORIES_LOAD_ERROR =
  'We couldn’t load categories. Check your connection and try again.';
export const CATEGORY_BLOCKED_TITLE = 'Can’t delete this category';
export const CATEGORY_DELETE_TEXT = 'This category has no items. It will be removed from the menu.';
export const CATEGORY_MOVE_ERROR = 'Couldn’t move the category. Try again.';
