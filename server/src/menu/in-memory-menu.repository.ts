import type { Category, Id, MenuItem } from '@restaurant/contracts';

import type { MenuRepository } from './menu.repository.js';
import type { MenuSeed } from './menu.seed.js';

export class InMemoryMenuRepository implements MenuRepository {
  private readonly categories: Map<Id, Category>;
  private readonly items: Map<Id, MenuItem>;

  constructor(seed: MenuSeed) {
    this.categories = new Map(seed.categories.map((category) => [category.id, category]));
    this.items = new Map(seed.items.map((item) => [item.id, item]));
  }

  async listCategories(): Promise<Category[]> {
    return [...this.categories.values()];
  }

  async findCategory(id: Id): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async saveCategory(category: Category): Promise<void> {
    this.categories.set(category.id, category);
  }

  async deleteCategory(id: Id): Promise<void> {
    this.categories.delete(id);
  }

  async countItemsInCategory(categoryId: Id): Promise<number> {
    return [...this.items.values()].filter((item) => item.categoryId === categoryId).length;
  }

  async listItems(): Promise<MenuItem[]> {
    return [...this.items.values()];
  }

  async findItem(id: Id): Promise<MenuItem | null> {
    return this.items.get(id) ?? null;
  }

  async saveItem(item: MenuItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async deleteItem(id: Id): Promise<void> {
    this.items.delete(id);
  }
}
