import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiErrorCode, type Order } from '@restaurant/contracts';

import { ApiException } from '../common/index.js';
import { IDEMPOTENCY_MISMATCH_MESSAGE } from './idempotency.config.js';

@Injectable()
export class IdempotencyService {
  private readonly results = new Map<string, { payload: string; result: Promise<Order> }>();

  // Stores the promise, not the order, so a concurrent duplicate joins the attempt in progress.
  async execute(key: string, payload: string, action: () => Promise<Order>): Promise<Order> {
    const existing = this.results.get(key);
    if (existing) {
      if (existing.payload !== payload) {
        throw new ApiException(
          { code: ApiErrorCode.IdempotencyMismatch, message: IDEMPOTENCY_MISMATCH_MESSAGE },
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      return existing.result;
    }

    const result = action();
    this.results.set(key, { payload, result });
    result.catch(() => this.results.delete(key));
    return result;
  }
}
