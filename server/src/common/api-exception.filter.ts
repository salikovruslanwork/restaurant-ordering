import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiErrorCode, type ApiError } from '@restaurant/contracts';

import {
  BAD_REQUEST_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE
} from './api-error.config.js';
import { ApiException } from './api.exception.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, error } = this.toApiResponse(exception);

    if (response.headersSent) {
      response.end();
      return;
    }
    response.status(status).json(error);
  }

  private toApiResponse(exception: unknown): { status: number; error: ApiError } {
    if (exception instanceof ApiException) {
      return { status: exception.getStatus(), error: exception.error };
    }

    const status = this.readStatus(exception);
    if (status === HttpStatus.NOT_FOUND) {
      return { status, error: { code: ApiErrorCode.NotFound, message: NOT_FOUND_MESSAGE } };
    }
    if (status !== null && status >= 400 && status < 500) {
      return {
        status,
        error: { code: ApiErrorCode.Validation, message: BAD_REQUEST_MESSAGE, fields: {} }
      };
    }

    this.logger.error(exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: ApiErrorCode.Internal, message: INTERNAL_ERROR_MESSAGE }
    };
  }

  // Body parser errors are not HttpExceptions; they carry a numeric status instead.
  private readStatus(exception: unknown): number | null {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (typeof exception === 'object' && exception !== null && 'status' in exception) {
      return typeof exception.status === 'number' ? exception.status : null;
    }
    return null;
  }
}
