import type { ApiError } from '@restaurant/contracts';

import { SERVER_ERROR_MESSAGE } from '../config/api.config';

export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly apiError: ApiError | null,
    message: string
  ) {
    super(message);
  }

  get isConnectionProblem(): boolean {
    return this.status === 0;
  }
}

export function requestErrorMessage(error: unknown): string {
  return error instanceof RequestError ? error.message : SERVER_ERROR_MESSAGE;
}
