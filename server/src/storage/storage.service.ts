import { debounceTime, Subscription } from 'rxjs';
import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown
} from '@nestjs/common';

import { EventsService } from '../events/index.js';
import { MenuService } from '../menu/index.js';
import { OrdersService } from '../orders/index.js';
import { saveData } from './data-file.js';
import { SAVE_DELAY_MS, STORAGE_ENABLED } from './storage.config.js';

// Every change already publishes an event, so a short quiet period after events triggers a save.
@Injectable()
export class StorageService implements OnApplicationBootstrap, OnApplicationShutdown {
  private subscription: Subscription | null = null;

  constructor(
    private readonly events: EventsService,
    private readonly menu: MenuService,
    private readonly orders: OrdersService
  ) {}

  onApplicationBootstrap(): void {
    if (!STORAGE_ENABLED) {
      return;
    }
    this.subscription = this.events
      .adminStream(null)
      .pipe(debounceTime(SAVE_DELAY_MS))
      .subscribe(() => void this.save());
  }

  onApplicationShutdown(): void {
    this.subscription?.unsubscribe();
  }

  private async save(): Promise<void> {
    const { categories, items } = await this.menu.getSnapshot();
    const { orders } = await this.orders.listAll();
    saveData({ categories, items, orders });
  }
}
