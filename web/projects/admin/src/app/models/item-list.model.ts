import type { Id, ItemPricing } from '@restaurant/contracts';

export interface ItemRow {
  id: Id;
  name: string;
  description: string;
  categoryName: string;
  pricing: ItemPricing;
  isAvailable: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

export interface ItemAvailabilityChange {
  id: Id;
  isAvailable: boolean;
}

export interface ItemList {
  rows: ItemRow[];
  total: number;
}
