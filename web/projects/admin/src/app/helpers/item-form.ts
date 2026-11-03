import type { ValidatorFn } from '@angular/forms';

import {
  ApiErrorCode,
  PricingKind,
  type CreateItemRequest,
  type Id,
  type MenuItem
} from '@restaurant/contracts';
import { RequestError } from '@shared/data-access';
import { parseMoney } from '@shared/util';
import { ITEM_SAVE_CONNECTION_ERROR, ITEM_SERVER_FIELDS } from '@admin/config/items.config';
import type { ItemFormValue, ItemSaveError } from '@admin/models/item-edit-dialog.model';

export function trimmedName(maxLength: number): ValidatorFn {
  return (control) => {
    const name = String(control.value ?? '').trim();
    if (!name) {
      return { required: true };
    }
    return name.length > maxLength ? { maxlength: true } : null;
  };
}

export function toItemFormValue(item: MenuItem | null, categoryId: Id | null): ItemFormValue {
  if (!item) {
    return {
      name: '',
      description: '',
      categoryId,
      pricingKind: PricingKind.Fixed,
      price: '',
      isAvailable: true
    };
  }
  return {
    name: item.name,
    description: item.description,
    categoryId: item.categoryId,
    pricingKind: item.pricing.kind,
    price: item.pricing.kind === PricingKind.Fixed ? (item.pricing.price / 100).toFixed(2) : '',
    isAvailable: item.isAvailable
  };
}

export function toItemRequest(value: ItemFormValue): CreateItemRequest {
  const price = parseMoney(value.price);
  return {
    categoryId: value.categoryId ?? '',
    name: value.name.trim(),
    description: value.description.trim(),
    pricing:
      value.pricingKind === PricingKind.Fixed && price !== null
        ? { kind: PricingKind.Fixed, price }
        : { kind: PricingKind.Open },
    isAvailable: value.isAvailable
  };
}

export function toItemSaveError(error: unknown): ItemSaveError {
  if (!(error instanceof RequestError)) {
    return { formError: ITEM_SAVE_CONNECTION_ERROR, fieldErrors: {} };
  }
  if (error.isConnectionProblem) {
    return { formError: ITEM_SAVE_CONNECTION_ERROR, fieldErrors: {} };
  }
  if (error.apiError?.code !== ApiErrorCode.Validation) {
    return { formError: error.message, fieldErrors: {} };
  }
  const result: ItemSaveError = { formError: null, fieldErrors: {} };
  for (const [path, messages] of Object.entries(error.apiError.fields)) {
    const field = ITEM_SERVER_FIELDS[path];
    const message = messages[0];
    if (field && message) {
      result.fieldErrors[field] ??= message;
    } else if (message) {
      result.formError ??= message;
    }
  }
  if (!result.formError && Object.keys(result.fieldErrors).length === 0) {
    result.formError = error.message;
  }
  return result;
}
