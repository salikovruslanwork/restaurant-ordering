import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post
} from '@nestjs/common';

import type { Category, MenuItem, MenuSnapshot } from '@restaurant/contracts';

import { CreateCategoryDto, CreateItemDto, UpdateCategoryDto, UpdateItemDto } from './menu.dto.js';
import { MenuService } from './menu.service.js';

@Controller()
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get('menu')
  getMenu(): Promise<MenuSnapshot> {
    return this.menu.getSnapshot();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.menu.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<Category> {
    return this.menu.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string): Promise<void> {
    return this.menu.deleteCategory(id);
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto): Promise<MenuItem> {
    return this.menu.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto): Promise<MenuItem> {
    return this.menu.updateItem(id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(@Param('id') id: string): Promise<void> {
    return this.menu.deleteItem(id);
  }
}
