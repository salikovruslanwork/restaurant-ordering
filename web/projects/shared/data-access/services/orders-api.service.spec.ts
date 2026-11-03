import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { OrderStatus } from '@restaurant/contracts';

import { OrdersApiService } from './orders-api.service';

describe('OrdersApiService', () => {
  let api: OrdersApiService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    api = TestBed.inject(OrdersApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('places an order with the idempotency key', () => {
    const body = { lines: [], discount: 0 };

    api.placeOrder(body, 'key-1').subscribe();

    const { request } = controller.expectOne('/api/orders');
    expect(request.method).toBe('POST');
    expect(request.body).toEqual(body);
    expect(request.headers.get('Idempotency-Key')).toBe('key-1');
  });

  it('lists all orders', () => {
    api.listAll().subscribe();

    const { request } = controller.expectOne('/api/orders');
    expect(request.method).toBe('GET');
  });

  it('lists the orders of this client', () => {
    api.listMine().subscribe();

    const { request } = controller.expectOne('/api/orders/mine');
    expect(request.method).toBe('GET');
  });

  it('changes a status', () => {
    const body = { status: OrderStatus.Preparing, expectedVersion: 1 };

    api.changeStatus('order-1', body).subscribe();

    const { request } = controller.expectOne('/api/orders/order-1/status');
    expect(request.method).toBe('PATCH');
    expect(request.body).toEqual(body);
  });
});
