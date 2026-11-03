import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import type { Order, OrdersSnapshot } from '@restaurant/contracts';

import { UuidHeader } from '../common/index.js';
import { CLIENT_ID_HEADER, IDEMPOTENCY_KEY_HEADER } from './orders.config.js';
import { ChangeOrderStatusDto, PlaceOrderDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  placeOrder(
    @UuidHeader(CLIENT_ID_HEADER) clientId: string,
    @UuidHeader(IDEMPOTENCY_KEY_HEADER) key: string,
    @Body() dto: PlaceOrderDto
  ): Promise<Order> {
    return this.orders.placeOrder(clientId, key, dto);
  }

  @Get()
  listAll(): Promise<OrdersSnapshot> {
    return this.orders.listAll();
  }

  @Get('mine')
  listMine(@UuidHeader(CLIENT_ID_HEADER) clientId: string): Promise<OrdersSnapshot> {
    return this.orders.listByClient(clientId);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeOrderStatusDto): Promise<Order> {
    return this.orders.changeStatus(id, dto);
  }
}
