import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested
} from 'class-validator';

import {
  PricingKind,
  type CreateCategoryRequest,
  type CreateItemRequest,
  type UpdateCategoryRequest,
  type UpdateItemRequest
} from '@restaurant/contracts';

import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_PRICE_CENTS,
  MENU_MESSAGES
} from './menu.config.js';

const Trimmed = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

// @IsOptional() also lets null through, which would overwrite required fields on PATCH.
const IfProvided = () => ValidateIf((_object, value) => value !== undefined);

const IsCategoryName = () =>
  applyDecorators(
    Trimmed(),
    IsString({ message: MENU_MESSAGES.categoryNameRequired }),
    IsNotEmpty({ message: MENU_MESSAGES.categoryNameRequired }),
    MaxLength(MAX_CATEGORY_NAME_LENGTH, { message: MENU_MESSAGES.categoryNameTooLong })
  );

const IsSortOrder = () =>
  applyDecorators(
    IsInt({ message: MENU_MESSAGES.sortOrderInvalid }),
    Min(0, { message: MENU_MESSAGES.sortOrderInvalid })
  );

const IsItemCategoryId = () => IsUUID(undefined, { message: MENU_MESSAGES.categoryRequired });

const IsItemName = () =>
  applyDecorators(
    Trimmed(),
    IsString({ message: MENU_MESSAGES.itemNameRequired }),
    IsNotEmpty({ message: MENU_MESSAGES.itemNameRequired }),
    MaxLength(MAX_ITEM_NAME_LENGTH, { message: MENU_MESSAGES.itemNameTooLong })
  );

const IsItemDescription = () =>
  applyDecorators(
    Trimmed(),
    IsString({ message: MENU_MESSAGES.descriptionTooLong }),
    MaxLength(MAX_ITEM_DESCRIPTION_LENGTH, { message: MENU_MESSAGES.descriptionTooLong })
  );

const IsItemAvailability = () => IsBoolean({ message: MENU_MESSAGES.availabilityInvalid });

// Fallback for a missing or unknown kind, which the discriminator below can't match.
class PricingDto {
  @IsEnum(PricingKind, { message: MENU_MESSAGES.pricingRequired })
  kind!: PricingKind;
}

class FixedPricingDto extends PricingDto {
  declare kind: PricingKind.Fixed;

  @IsInt({ message: MENU_MESSAGES.priceInvalid })
  @Min(1, { message: MENU_MESSAGES.priceTooLow })
  @Max(MAX_PRICE_CENTS, { message: MENU_MESSAGES.priceTooHigh })
  price!: number;
}

class OpenPricingDto extends PricingDto {
  declare kind: PricingKind.Open;
}

const IsItemPricing = () =>
  applyDecorators(
    ValidateNested({ message: MENU_MESSAGES.pricingRequired }),
    Type(() => PricingDto, {
      keepDiscriminatorProperty: true,
      discriminator: {
        property: 'kind',
        subTypes: [
          { value: FixedPricingDto, name: PricingKind.Fixed },
          { value: OpenPricingDto, name: PricingKind.Open }
        ]
      }
    })
  );

export class CreateCategoryDto implements CreateCategoryRequest {
  @IsCategoryName()
  name!: string;

  @IfProvided()
  @IsSortOrder()
  sortOrder?: number;
}

export class UpdateCategoryDto implements UpdateCategoryRequest {
  @IfProvided()
  @IsCategoryName()
  name?: string;

  @IfProvided()
  @IsSortOrder()
  sortOrder?: number;
}

export class CreateItemDto implements CreateItemRequest {
  @IsItemCategoryId()
  categoryId!: string;

  @IsItemName()
  name!: string;

  @IsItemDescription()
  description!: string;

  @IsDefined({ message: MENU_MESSAGES.pricingRequired })
  @IsItemPricing()
  pricing!: FixedPricingDto | OpenPricingDto;

  @IsItemAvailability()
  isAvailable!: boolean;
}

export class UpdateItemDto implements UpdateItemRequest {
  @IfProvided()
  @IsItemCategoryId()
  categoryId?: string;

  @IfProvided()
  @IsItemName()
  name?: string;

  @IfProvided()
  @IsItemDescription()
  description?: string;

  @IfProvided()
  @IsDefined({ message: MENU_MESSAGES.pricingRequired })
  @IsItemPricing()
  pricing?: FixedPricingDto | OpenPricingDto;

  @IfProvided()
  @IsItemAvailability()
  isAvailable?: boolean;
}
