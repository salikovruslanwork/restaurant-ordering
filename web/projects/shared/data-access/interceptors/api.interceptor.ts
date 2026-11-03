import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';

import { catchError, retry, tap, throwError, timer } from 'rxjs';

import { Store } from '@ngrx/store';

import { ApiErrorCode } from '@restaurant/contracts';
import { backoffDelay, isApiError } from '@shared/util';

import {
  CONNECTION_ERROR_MESSAGE,
  SAFE_REQUEST_RETRIES,
  SERVER_ERROR_MESSAGE
} from '../config/api.config';
import { RequestError } from '../helpers/request-error';
import { connectionActions } from '../store/connection/connection.actions';

function isNoResponse(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

function toRequestError(error: unknown): RequestError {
  if (isNoResponse(error)) {
    return new RequestError(0, null, CONNECTION_ERROR_MESSAGE);
  }
  if (error instanceof HttpErrorResponse && isApiError(error.error)) {
    return new RequestError(error.status, error.error, error.error.message);
  }
  const status = error instanceof HttpErrorResponse ? error.status : 500;
  const apiError = { code: ApiErrorCode.Internal, message: SERVER_ERROR_MESSAGE } as const;
  return new RequestError(status, apiError, SERVER_ERROR_MESSAGE);
}

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(Store);

  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        if (isNoResponse(error)) {
          store.dispatch(connectionActions.requestNoResponse());
        }
      }
    }),
    retry({
      count: request.method === 'GET' ? SAFE_REQUEST_RETRIES : 0,
      delay: (error: unknown, retryCount) =>
        isNoResponse(error) ? timer(backoffDelay(retryCount - 1)) : throwError(() => error)
    }),
    catchError((error: unknown) => throwError(() => toRequestError(error)))
  );
};
