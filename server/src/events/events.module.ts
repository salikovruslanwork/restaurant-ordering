import { Module } from '@nestjs/common';

import { DEFAULT_EVENTS_OPTIONS, EVENTS_OPTIONS } from './events.config.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  controllers: [EventsController],
  providers: [EventsService, { provide: EVENTS_OPTIONS, useValue: DEFAULT_EVENTS_OPTIONS }],
  exports: [EventsService]
})
export class EventsModule {}
