import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { SERVER_PORT } from './app.config.js';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
configureApp(app);
await app.listen(SERVER_PORT);
