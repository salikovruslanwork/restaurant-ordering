import { Module } from '@nestjs/common';

import { EventsModule } from '../events/index.js';
import { MenuModule } from '../menu/index.js';
import { OrdersModule } from '../orders/index.js';
import { StorageService } from './storage.service.js';

@Module({
  imports: [EventsModule, MenuModule, OrdersModule],
  providers: [StorageService]
})
export class StorageModule {}
