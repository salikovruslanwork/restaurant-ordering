import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PricingKind, type CreateItemRequest } from '@restaurant/contracts';

import { MenuApiService } from './menu-api.service';

describe('MenuApiService', () => {
  let api: MenuApiService;
  let controller: HttpTestingController;

  const itemRequest: CreateItemRequest = {
    categoryId: 'category-1',
    name: 'Oolong',
    description: '',
    pricing: { kind: PricingKind.Open },
    isAvailable: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    api = TestBed.inject(MenuApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it.each<[string, string, string, () => { subscribe: () => unknown }, unknown]>([
    ['getMenu', 'GET', '/api/menu', () => api.getMenu(), null],
    [
      'createCategory',
      'POST',
      '/api/categories',
      () => api.createCategory({ name: 'Teas' }),
      { name: 'Teas' }
    ],
    [
      'updateCategory',
      'PATCH',
      '/api/categories/a',
      () => api.updateCategory('a', { sortOrder: 2 }),
      { sortOrder: 2 }
    ],
    ['deleteCategory', 'DELETE', '/api/categories/a', () => api.deleteCategory('a'), null],
    ['createItem', 'POST', '/api/items', () => api.createItem(itemRequest), itemRequest],
    [
      'updateItem',
      'PATCH',
      '/api/items/a',
      () => api.updateItem('a', { isAvailable: false }),
      { isAvailable: false }
    ],
    ['deleteItem', 'DELETE', '/api/items/a', () => api.deleteItem('a'), null]
  ])('%s sends %s %s', (_name, method, url, call, body) => {
    call().subscribe();

    const request = controller.expectOne(url);
    expect(request.request.method).toBe(method);
    expect(request.request.body).toEqual(body);
  });
});
