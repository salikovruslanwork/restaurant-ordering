import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import type {
  Category,
  CreateCategoryRequest,
  CreateItemRequest,
  Id,
  MenuItem,
  MenuSnapshot,
  UpdateCategoryRequest,
  UpdateItemRequest
} from '@restaurant/contracts';

import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly http = inject(HttpClient);

  getMenu(): Observable<MenuSnapshot> {
    return this.http.get<MenuSnapshot>(`${API_URL}/menu`);
  }

  createCategory(request: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${API_URL}/categories`, request);
  }

  updateCategory(id: Id, request: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${API_URL}/categories/${id}`, request);
  }

  deleteCategory(id: Id): Observable<void> {
    return this.http.delete<void>(`${API_URL}/categories/${id}`);
  }

  createItem(request: CreateItemRequest): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${API_URL}/items`, request);
  }

  updateItem(id: Id, request: UpdateItemRequest): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${API_URL}/items/${id}`, request);
  }

  deleteItem(id: Id): Observable<void> {
    return this.http.delete<void>(`${API_URL}/items/${id}`);
  }
}
