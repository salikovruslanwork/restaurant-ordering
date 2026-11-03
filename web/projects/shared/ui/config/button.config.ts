import { ButtonVariant } from '../models/button.model';

export const BUTTON_APPEARANCE = {
  [ButtonVariant.Filled]: 'filled',
  [ButtonVariant.Tonal]: 'tonal',
  [ButtonVariant.Outlined]: 'outlined',
  [ButtonVariant.Text]: 'text',
  [ButtonVariant.Danger]: 'filled',
  [ButtonVariant.OutlinedDanger]: 'outlined',
  [ButtonVariant.TextDanger]: 'text',
  [ButtonVariant.Icon]: 'text',
  [ButtonVariant.Fab]: 'text'
} as const;

export const BUTTON_ICON_SIZE = 18;
export const ICON_BUTTON_ICON_SIZE = 22;
export const ICON_BUTTON_SMALL_ICON_SIZE = 18;
export const FAB_ICON_SIZE = 26;
