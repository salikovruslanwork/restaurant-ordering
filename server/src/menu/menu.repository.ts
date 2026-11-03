import type { Category, Id, MenuItem } from '@restaurant/contracts';

export interface MenuRepository {
  listCategories(): Promise<Category[]>;
  findCategory(id: Id): Promise<Category | null>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(id: Id): Promise<void>;
  countItemsInCategory(categoryId: Id): Promise<number>;

  listItems(): Promise<MenuItem[]>;
  findItem(id: Id): Promise<MenuItem | null>;
  saveItem(item: MenuItem): Promise<void>;
  deleteItem(id: Id): Promise<void>;
}
