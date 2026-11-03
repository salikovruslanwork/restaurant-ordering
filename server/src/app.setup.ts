import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import type { Request, Response } from 'express';

import { API_PREFIX, EVENTS_PATH } from './app.config.js';
import { ApiExceptionFilter, ApiValidationPipe } from './common/index.js';

// A compressed event stream would sit in the gzip buffer instead of reaching the browser.
function shouldCompress(request: Request, response: Response): boolean {
  return !request.path.startsWith(EVENTS_PATH) && compression.filter(request, response);
}

export function configureApp(app: NestExpressApplication): void {
  app.use(compression({ filter: shouldCompress }));
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ApiValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
}
