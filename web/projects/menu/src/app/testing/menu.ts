import { PricingKind, type Category, type MenuItem } from '@restaurant/contracts';

export function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'miso',
    categoryId: 'soup',
    name: 'Miso',
    description: 'Warm broth',
    pricing: { kind: PricingKind.Fixed, price: 450 },
    isAvailable: true,
    version: 1,
    updatedAt: '2026-11-02T12:00:00.000Z',
    ...overrides
  };
}

export function makeCategory(id: string, name: string, sortOrder: number): Category {
  return { id, name, sortOrder, version: 1 };
}
