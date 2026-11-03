import { Module } from '@nestjs/common';

import { EventsModule } from '../events/index.js';
import { IdempotencyModule } from '../idempotency/index.js';
import { MenuModule } from '../menu/index.js';
import { loadData } from '../storage/data-file.js';
import { InMemoryOrdersRepository } from './in-memory-orders.repository.js';
import { ORDERS_REPOSITORY } from './orders.config.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [EventsModule, IdempotencyModule, MenuModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDERS_REPOSITORY,
      useFactory: () => new InMemoryOrdersRepository(loadData().orders)
    }
  ],
  exports: [OrdersService]
})
export class OrdersModule {}
