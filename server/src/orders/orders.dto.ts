import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

import {
  OrderStatus,
  type ChangeOrderStatusRequest,
  type PlaceOrderRequest
} from '@restaurant/contracts';

import { MAX_PRICE_CENTS } from '../menu/index.js';
import { MAX_QUANTITY, MIN_QUANTITY, ORDER_MESSAGES } from './orders.config.js';

class OrderLineDto {
  @IsUUID(undefined, { message: ORDER_MESSAGES.itemInvalid })
  itemId!: string;

  @IsInt({ message: ORDER_MESSAGES.quantityInvalid })
  @Min(MIN_QUANTITY, { message: ORDER_MESSAGES.quantityInvalid })
  @Max(MAX_QUANTITY, { message: ORDER_MESSAGES.quantityInvalid })
  quantity!: number;

  @IsInt({ message: ORDER_MESSAGES.amountInvalid })
  @Min(1, { message: ORDER_MESSAGES.amountTooLow })
  @Max(MAX_PRICE_CENTS, { message: ORDER_MESSAGES.amountTooHigh })
  unitPrice!: number;

  @IsBoolean({ message: ORDER_MESSAGES.openPriceInvalid })
  isOpenPrice!: boolean;

  @IsInt({ message: ORDER_MESSAGES.itemVersionInvalid })
  @Min(1, { message: ORDER_MESSAGES.itemVersionInvalid })
  itemVersion!: number;
}

export class PlaceOrderDto implements PlaceOrderRequest {
  @IsArray({ message: ORDER_MESSAGES.linesRequired })
  @ArrayMinSize(1, { message: ORDER_MESSAGES.linesRequired })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines!: OrderLineDto[];

  @IsInt({ message: ORDER_MESSAGES.discountInvalid })
  @Min(0, { message: ORDER_MESSAGES.discountInvalid })
  discount!: number;
}

export class ChangeOrderStatusDto implements ChangeOrderStatusRequest {
  @IsEnum(OrderStatus, { message: ORDER_MESSAGES.statusInvalid })
  status!: OrderStatus;

  @IsInt({ message: ORDER_MESSAGES.expectedVersionInvalid })
  @Min(1, { message: ORDER_MESSAGES.expectedVersionInvalid })
  expectedVersion!: number;
}
