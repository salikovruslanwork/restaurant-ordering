import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientIdService } from '../services/client-id.service';
import { clientIdInterceptor } from './client-id.interceptor';

describe('clientIdInterceptor', () => {
  it('adds the client id to a request', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([clientIdInterceptor])),
        provideHttpClientTesting(),
        { provide: ClientIdService, useValue: { id: 'client-1' } }
      ]
    });

    TestBed.inject(HttpClient).get('/api/orders/mine').subscribe();

    const controller = TestBed.inject(HttpTestingController);
    const { request } = controller.expectOne('/api/orders/mine');
    expect(request.headers.get('X-Client-Id')).toBe('client-1');
    controller.verify();
  });
});
