import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';

import { ApiErrorCode } from '@restaurant/contracts';

import { VALIDATION_ERROR_MESSAGE } from './api-error.config.js';
import { ApiException } from './api.exception.js';

function toFields(errors: ValidationError[], parentPath = ''): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((fields, error) => {
    const path = `${parentPath}${error.property}`;
    const messages = Object.values(error.constraints ?? {});
    return {
      ...fields,
      ...(messages.length > 0 ? { [path]: messages } : {}),
      ...toFields(error.children ?? [], `${path}.`)
    };
  }, {});
}

export class ApiValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ApiException(
          {
            code: ApiErrorCode.Validation,
            message: VALIDATION_ERROR_MESSAGE,
            fields: toFields(errors)
          },
          HttpStatus.BAD_REQUEST
        )
    });
  }
}
