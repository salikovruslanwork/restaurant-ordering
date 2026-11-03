import { HttpException, HttpStatus } from '@nestjs/common';

import type { ApiError } from '@restaurant/contracts';

export class ApiException extends HttpException {
  constructor(
    readonly error: ApiError,
    status: HttpStatus
  ) {
    super(error, status);
  }
}
