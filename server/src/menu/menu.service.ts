import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  ApiErrorCode,
  PricingKind,
  ServerEventType,
  type Category,
  type CreateCategoryRequest,
  type CreateItemRequest,
  type Id,
  type ItemPricing,
  type MenuItem,
  type MenuSnapshot,
  type UpdateCategoryRequest,
  type UpdateItemRequest
} from '@restaurant/contracts';

import { ApiException, VALIDATION_ERROR_MESSAGE } from '../common/index.js';
import { EventsService } from '../events/index.js';
import { MENU_MESSAGES, MENU_REPOSITORY } from './menu.config.js';
import type { MenuRepository } from './menu.repository.js';

@Injectable()
export class MenuService {
  constructor(
    @Inject(MENU_REPOSITORY) private readonly repository: MenuRepository,
    private readonly events: EventsService
  ) {}

  async getSnapshot(): Promise<MenuSnapshot> {
    // Read before the data: an event in between is replayed, never lost.
    const seq = this.events.currentSeq;
    const [categories, items] = await Promise.all([
      this.repository.listCategories(),
      this.repository.listItems()
    ]);

    return { categories: categories.sort((a, b) => a.sortOrder - b.sortOrder), items, seq };
  }

  async findItems(ids: Id[]): Promise<Map<Id, MenuItem>> {
    const items = await Promise.all(ids.map((id) => this.repository.findItem(id)));
    return new Map(items.flatMap((item) => (item ? [[item.id, item]] : [])));
  }

  async createCategory(request: CreateCategoryRequest): Promise<Category> {
    const categories = await this.repository.listCategories();
    this.assertCategoryNameIsFree(categories, request.name, null);
    const lastSortOrder = Math.max(-1, ...categories.map(({ sortOrder }) => sortOrder));
    const category: Category = {
      id: randomUUID(),
      name: request.name,
      sortOrder: request.sortOrder ?? lastSortOrder + 1,
      version: 1
    };

    return this.saveCategory(category);
  }

  async updateCategory(id: Id, request: UpdateCategoryRequest): Promise<Category> {
    const current = await this.requireCategory(id);
    const next: Category = {
      ...current,
      name: request.name ?? current.name,
      sortOrder: request.sortOrder ?? current.sortOrder
    };
    if (isDeepStrictEqual(next, current)) {
      return current;
    }

    const categories = await this.repository.listCategories();
    this.assertCategoryNameIsFree(categories, next.name, id);
    return this.saveCategory({ ...next, version: current.version + 1 });
  }

  async deleteCategory(id: Id): Promise<void> {
    const category = await this.requireCategory(id);
    const itemCount = await this.repository.countItemsInCategory(id);
    if (itemCount > 0) {
      throw new ApiException(
        {
          code: ApiErrorCode.CategoryNotEmpty,
          message: `Can't delete '${category.name}' — it still has ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. Move or delete them first.`
        },
        HttpStatus.CONFLICT
      );
    }

    await this.repository.deleteCategory(id);
    this.events.publish({ type: ServerEventType.CategoryDeleted, id });
  }

  async createItem(request: CreateItemRequest): Promise<MenuItem> {
    await this.assertCategoryExists(request.categoryId);
    return this.saveItem({
      id: randomUUID(),
      categoryId: request.categoryId,
      name: request.name,
      description: request.description,
      pricing: this.toPricing(request.pricing),
      isAvailable: request.isAvailable,
      version: 1,
      updatedAt: new Date().toISOString()
    });
  }

  async updateItem(id: Id, request: UpdateItemRequest): Promise<MenuItem> {
    const current = await this.requireItem(id);
    const next: MenuItem = {
      ...current,
      categoryId: request.categoryId ?? current.categoryId,
      name: request.name ?? current.name,
      description: request.description ?? current.description,
      pricing: request.pricing ? this.toPricing(request.pricing) : current.pricing,
      isAvailable: request.isAvailable ?? current.isAvailable
    };
    if (isDeepStrictEqual(next, current)) {
      return current;
    }

    if (next.categoryId !== current.categoryId) {
      await this.assertCategoryExists(next.categoryId);
    }
    return this.saveItem({
      ...next,
      version: current.version + 1,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteItem(id: Id): Promise<void> {
    await this.requireItem(id);
    await this.repository.deleteItem(id);
    this.events.publish({ type: ServerEventType.ItemDeleted, id });
  }

  private async saveCategory(category: Category): Promise<Category> {
    await this.repository.saveCategory(category);
    this.events.publish({ type: ServerEventType.CategoryUpserted, category });
    return category;
  }

  private async saveItem(item: MenuItem): Promise<MenuItem> {
    await this.repository.saveItem(item);
    this.events.publish({ type: ServerEventType.ItemUpserted, item });
    return item;
  }

  // The DTO arrives as a class instance; store and compare plain contract values only.
  private toPricing(pricing: ItemPricing): ItemPricing {
    return pricing.kind === PricingKind.Fixed
      ? { kind: PricingKind.Fixed, price: pricing.price }
      : { kind: PricingKind.Open };
  }

  private async requireCategory(id: Id): Promise<Category> {
    const category = await this.repository.findCategory(id);
    if (!category) {
      throw this.notFound(MENU_MESSAGES.categoryNotFound);
    }
    return category;
  }

  private async requireItem(id: Id): Promise<MenuItem> {
    const item = await this.repository.findItem(id);
    if (!item) {
      throw this.notFound(MENU_MESSAGES.itemNotFound);
    }
    return item;
  }

  private async assertCategoryExists(id: Id): Promise<void> {
    if (!(await this.repository.findCategory(id))) {
      throw this.invalidField('categoryId', MENU_MESSAGES.categoryRequired);
    }
  }

  private assertCategoryNameIsFree(categories: Category[], name: string, ownId: Id | null): void {
    const lowerCaseName = name.toLowerCase();
    const isTaken = categories.some(
      (category) => category.id !== ownId && category.name.toLowerCase() === lowerCaseName
    );
    if (isTaken) {
      throw this.invalidField('name', MENU_MESSAGES.categoryNameTaken);
    }
  }

  private notFound(message: string): ApiException {
    return new ApiException({ code: ApiErrorCode.NotFound, message }, HttpStatus.NOT_FOUND);
  }

  private invalidField(field: string, message: string): ApiException {
    return new ApiException(
      {
        code: ApiErrorCode.Validation,
        message: VALIDATION_ERROR_MESSAGE,
        fields: { [field]: [message] }
      },
      HttpStatus.BAD_REQUEST
    );
  }
}
