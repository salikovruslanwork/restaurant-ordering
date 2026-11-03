import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import type {
  ChangeOrderStatusRequest,
  Id,
  Order,
  OrdersSnapshot,
  PlaceOrderRequest
} from '@restaurant/contracts';

import { API_URL, IDEMPOTENCY_KEY_HEADER } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);

  placeOrder(request: PlaceOrderRequest, idempotencyKey: string): Observable<Order> {
    return this.http.post<Order>(`${API_URL}/orders`, request, {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey }
    });
  }

  listAll(): Observable<OrdersSnapshot> {
    return this.http.get<OrdersSnapshot>(`${API_URL}/orders`);
  }

  listMine(): Observable<OrdersSnapshot> {
    return this.http.get<OrdersSnapshot>(`${API_URL}/orders/mine`);
  }

  changeStatus(id: Id, request: ChangeOrderStatusRequest): Observable<Order> {
    return this.http.patch<Order>(`${API_URL}/orders/${id}/status`, request);
  }
}
