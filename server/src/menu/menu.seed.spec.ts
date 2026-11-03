import { isUUID } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { PricingKind } from '@restaurant/contracts';

import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_PRICE_CENTS
} from './menu.config.js';
import { createMenuSeed } from './menu.seed.js';

const NOW = '2026-11-01T00:00:00.000Z';

describe('createMenuSeed', () => {
  const { categories, items } = createMenuSeed(NOW);

  it('creates 25 categories and 625 items', () => {
    expect(categories).toHaveLength(25);
    expect(items).toHaveLength(625);
  });

  it('uses unique UUIDs for categories and items', () => {
    const ids = [...categories, ...items].map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => isUUID(id))).toBe(true);
  });

  it('gives every category a unique name within the limit and its own position', () => {
    const names = categories.map(({ name }) => name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name.length <= MAX_CATEGORY_NAME_LENGTH)).toBe(true);
    expect(categories.map(({ sortOrder }) => sortOrder)).toEqual(categories.map((_, i) => i));
  });

  it('puts 25 items with unique names in every category', () => {
    for (const category of categories) {
      const names = items.filter((item) => item.categoryId === category.id).map((i) => i.name);

      expect(names).toHaveLength(25);
      expect(new Set(names).size).toBe(25);
    }
  });

  it('keeps every item within the form limits', () => {
    for (const item of items) {
      expect(item.name.length).toBeLessThanOrEqual(MAX_ITEM_NAME_LENGTH);
      expect(item.description.length).toBeLessThanOrEqual(MAX_ITEM_DESCRIPTION_LENGTH);
      if (item.pricing.kind === PricingKind.Fixed) {
        expect(Number.isInteger(item.pricing.price)).toBe(true);
        expect(item.pricing.price).toBeGreaterThan(0);
        expect(item.pricing.price).toBeLessThanOrEqual(MAX_PRICE_CENTS);
      }
    }
  });

  it('includes some open-price and some unavailable items, but mostly regular ones', () => {
    const open = items.filter(({ pricing }) => pricing.kind === PricingKind.Open);
    const unavailable = items.filter(({ isAvailable }) => !isAvailable);

    expect(open.length).toBeGreaterThan(0);
    expect(open.length).toBeLessThan(60);
    expect(unavailable.length).toBeGreaterThan(0);
    expect(unavailable.length).toBeLessThan(60);
  });

  it('starts versions at 1 and uses the given time', () => {
    expect(categories.every(({ version }) => version === 1)).toBe(true);
    expect(items.every(({ version, updatedAt }) => version === 1 && updatedAt === NOW)).toBe(true);
  });

  it('creates the same ids on every run, so saved carts survive a restart', () => {
    const again = createMenuSeed(NOW);

    expect(again.items.map(({ id }) => id)).toEqual(items.map(({ id }) => id));
    expect(again.categories).toEqual(categories);
  });
});
