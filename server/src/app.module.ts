import { Module } from '@nestjs/common';

import { EventsModule } from './events/index.js';
import { MenuModule } from './menu/index.js';
import { OrdersModule } from './orders/index.js';
import { StorageModule } from './storage/index.js';

@Module({
  imports: [EventsModule, MenuModule, OrdersModule, StorageModule]
})
export class AppModule {}
