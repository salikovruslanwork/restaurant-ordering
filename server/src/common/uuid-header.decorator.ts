import { createParamDecorator, HttpStatus, type ExecutionContext } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

import { ApiErrorCode } from '@restaurant/contracts';

import { VALIDATION_ERROR_MESSAGE } from './api-error.config.js';
import { ApiException } from './api.exception.js';

export const UuidHeader = createParamDecorator((name: string, context: ExecutionContext) => {
  const value = context.switchToHttp().getRequest<Request>().header(name);
  if (!isUUID(value)) {
    throw new ApiException(
      {
        code: ApiErrorCode.Validation,
        message: VALIDATION_ERROR_MESSAGE,
        fields: { [name]: [`The ${name} header must be a UUID`] }
      },
      HttpStatus.BAD_REQUEST
    );
  }
  return value;
});
