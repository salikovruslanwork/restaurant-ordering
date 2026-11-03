import { Module } from '@nestjs/common';

import { EventsModule } from '../events/index.js';
import { loadData } from '../storage/data-file.js';
import { InMemoryMenuRepository } from './in-memory-menu.repository.js';
import { MENU_REPOSITORY } from './menu.config.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

@Module({
  imports: [EventsModule],
  controllers: [MenuController],
  providers: [
    MenuService,
    { provide: MENU_REPOSITORY, useFactory: () => new InMemoryMenuRepository(loadData()) }
  ],
  exports: [MenuService]
})
export class MenuModule {}
