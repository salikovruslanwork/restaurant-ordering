import { DishImageSize } from '../models/dish-image.model';

export const DISH_IMAGE_TONES = ['warm', 'honey', 'herb', 'berry'] as const;
export const DISH_IMAGE_PLACEHOLDER_ICON = 'restaurant';

export const DISH_IMAGE_ICON_SIZES: Record<DishImageSize, number> = {
  [DishImageSize.Default]: 44,
  [DishImageSize.Thumb]: 22,
  [DishImageSize.Compact]: 36
};
