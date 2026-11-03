import type { Cents, Id, IsoDate } from './common.model.js';
import type { PricingKind } from './pricing-kind.enum.js';

export interface Category {
  id: Id;
  name: string;
  sortOrder: number;
  version: number;
}

export type ItemPricing = { kind: PricingKind.Fixed; price: Cents } | { kind: PricingKind.Open };

export interface MenuItem {
  id: Id;
  categoryId: Id;
  name: string;
  description: string;
  pricing: ItemPricing;
  isAvailable: boolean;
  version: number;
  updatedAt: IsoDate;
}

export interface MenuSnapshot {
  categories: Category[];
  items: MenuItem[];
  seq: number;
}

export interface CreateCategoryRequest {
  name: string;
  sortOrder?: number;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export interface CreateItemRequest {
  categoryId: Id;
  name: string;
  description: string;
  pricing: ItemPricing;
  isAvailable: boolean;
}

export type UpdateItemRequest = Partial<CreateItemRequest>;
