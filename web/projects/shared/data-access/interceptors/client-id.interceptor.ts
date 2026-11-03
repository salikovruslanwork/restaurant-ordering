import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';

import { CLIENT_ID_HEADER } from '../config/api.config';
import { ClientIdService } from '../services/client-id.service';

export const clientIdInterceptor: HttpInterceptorFn = (request, next) => {
  const { id } = inject(ClientIdService);
  return next(request.clone({ setHeaders: { [CLIENT_ID_HEADER]: id } }));
};
