import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  type ArgumentsHost
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min, ValidateNested } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiErrorCode } from '@restaurant/contracts';

import { configureApp } from '../app.setup.js';
import {
  BAD_REQUEST_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  VALIDATION_ERROR_MESSAGE
} from './api-error.config.js';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { ApiException } from './api.exception.js';

const SECRET = 'database password is hunter2';

class LineDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}

class ProbeDto {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => LineDto)
  line!: LineDto;
}

@Controller('probe')
class ProbeController {
  @Get('api-exception')
  apiException(): void {
    throw new ApiException(
      { code: ApiErrorCode.VersionConflict, message: 'Order was updated' },
      HttpStatus.CONFLICT
    );
  }

  @Get('forbidden')
  forbidden(): void {
    throw new ForbiddenException(SECRET);
  }

  @Get('crash')
  crash(): void {
    throw new Error(SECRET);
  }

  @Get('unavailable')
  unavailable(): void {
    throw new HttpException(SECRET, HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Get('status-text')
  statusText(): void {
    throw Object.assign(new Error(SECRET), { status: 'broken' });
  }

  @Post('body')
  body(@Body() dto: ProbeDto): ProbeDto {
    return dto;
  }
}

describe('ApiExceptionFilter', () => {
  let app: NestExpressApplication;
  const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController]
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    logError.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an ApiException body and status as they are', async () => {
    const response = await request(app.getHttpServer()).get('/api/probe/api-exception');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      code: ApiErrorCode.VersionConflict,
      message: 'Order was updated'
    });
  });

  it('maps an unknown route to NOT_FOUND', async () => {
    const response = await request(app.getHttpServer()).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: ApiErrorCode.NotFound, message: NOT_FOUND_MESSAGE });
  });

  it('keeps the status of other 4xx errors and hides their message', async () => {
    const response = await request(app.getHttpServer()).get('/api/probe/forbidden');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: ApiErrorCode.Validation,
      message: BAD_REQUEST_MESSAGE,
      fields: {}
    });
  });

  it.each(['crash', 'unavailable', 'status-text'])(
    'returns a safe INTERNAL error and logs the cause for %s',
    async (path) => {
      const response = await request(app.getHttpServer()).get(`/api/probe/${path}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: ApiErrorCode.Internal,
        message: INTERNAL_ERROR_MESSAGE
      });
      expect(JSON.stringify(response.body)).not.toContain(SECRET);
      expect(logError).toHaveBeenCalledOnce();
    }
  );

  it('maps malformed JSON to a 400 ApiError', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe/body')
      .set('Content-Type', 'application/json')
      .send('{ not json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: ApiErrorCode.Validation,
      message: BAD_REQUEST_MESSAGE,
      fields: {}
    });
  });

  it('lists invalid fields by path, including nested ones', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe/body')
      .send({ name: 1, line: { quantity: 0 } });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: ApiErrorCode.Validation,
      message: VALIDATION_ERROR_MESSAGE,
      fields: {
        name: [expect.any(String)],
        'line.quantity': [expect.any(String)]
      }
    });
  });

  it('strips unknown properties from valid bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe/body')
      .send({ name: 'Tea', line: { quantity: 1 }, extra: true });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ name: 'Tea', line: { quantity: 1 } });
  });

  it('only ends the response when the headers were already sent', () => {
    const response = { headersSent: true, end: vi.fn(), status: vi.fn() };
    const host: Pick<ArgumentsHost, 'switchToHttp'> = {
      switchToHttp: () => ({
        getResponse: <T>() => response as T,
        getRequest: <T>() => ({}) as T,
        getNext: <T>() => (() => undefined) as T
      })
    };

    new ApiExceptionFilter().catch(new Error(SECRET), host as ArgumentsHost);

    expect(response.end).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});
