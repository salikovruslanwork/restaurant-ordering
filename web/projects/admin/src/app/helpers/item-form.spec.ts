import { FormControl } from '@angular/forms';

import { ApiErrorCode, PricingKind, type MenuItem } from '@restaurant/contracts';
import { RequestError } from '@shared/data-access';
import { ITEM_SAVE_CONNECTION_ERROR } from '@admin/config/items.config';
import { ItemFormField } from '@admin/models/menu-editor.model';

import { toItemFormValue, toItemRequest, toItemSaveError, trimmedName } from './item-form';

const item: MenuItem = {
  id: 'miso',
  categoryId: 'soup',
  name: 'Miso',
  description: 'Warm',
  pricing: { kind: PricingKind.Fixed, price: 1250 },
  isAvailable: false,
  version: 3,
  updatedAt: '2026-11-01T00:00:00.000Z'
};

describe('item form helpers', () => {
  it('checks a trimmed name and its length', () => {
    const validate = trimmedName(5);

    expect(validate(new FormControl('  '))).toEqual({ required: true });
    expect(validate(new FormControl(' abcde '))).toBeNull();
    expect(validate(new FormControl('abcdef'))).toEqual({ maxlength: true });
  });

  it('fills the form from an item, with the price as dollars', () => {
    expect(toItemFormValue(item, 'other')).toEqual({
      name: 'Miso',
      description: 'Warm',
      categoryId: 'soup',
      pricingKind: PricingKind.Fixed,
      price: '12.50',
      isAvailable: false
    });
  });

  it('starts a new item available, with a fixed price and the chosen category', () => {
    expect(toItemFormValue(null, 'soup')).toMatchObject({
      name: '',
      categoryId: 'soup',
      pricingKind: PricingKind.Fixed,
      price: '',
      isAvailable: true
    });
    expect(toItemFormValue({ ...item, pricing: { kind: PricingKind.Open } }, null).price).toBe('');
  });

  it('builds a trimmed request with cents', () => {
    const value = { ...toItemFormValue(item, null), name: ' Miso ', price: '4.5' };

    expect(toItemRequest(value)).toEqual({
      categoryId: 'soup',
      name: 'Miso',
      description: 'Warm',
      pricing: { kind: PricingKind.Fixed, price: 450 },
      isAvailable: false
    });
    expect(toItemRequest({ ...value, pricingKind: PricingKind.Open }).pricing).toEqual({
      kind: PricingKind.Open
    });
  });

  describe('save errors', () => {
    it('maps server field paths to form fields, keeping the first message', () => {
      const error = new RequestError(
        400,
        {
          code: ApiErrorCode.Validation,
          message: 'Check the form',
          fields: {
            name: ['Enter a name', 'Second'],
            'pricing.price': ['The price must be more than $0']
          }
        },
        'Check the form'
      );

      expect(toItemSaveError(error)).toEqual({
        formError: null,
        fieldErrors: {
          [ItemFormField.Name]: 'Enter a name',
          [ItemFormField.Price]: 'The price must be more than $0'
        }
      });
    });

    it('shows unknown fields, or no fields, at the top of the form', () => {
      const withUnknown = new RequestError(
        400,
        { code: ApiErrorCode.Validation, message: 'Check', fields: { isAvailable: ['Choose'] } },
        'Check'
      );
      const empty = new RequestError(
        400,
        { code: ApiErrorCode.Validation, message: 'Check', fields: {} },
        'Check'
      );

      expect(toItemSaveError(withUnknown)).toEqual({ formError: 'Choose', fieldErrors: {} });
      expect(toItemSaveError(empty)).toEqual({ formError: 'Check', fieldErrors: {} });
    });

    it('explains connection problems and keeps other messages', () => {
      const notFound = new RequestError(
        404,
        { code: ApiErrorCode.NotFound, message: 'This item no longer exists.' },
        'This item no longer exists.'
      );

      expect(toItemSaveError(new RequestError(0, null, 'Offline')).formError).toBe(
        ITEM_SAVE_CONNECTION_ERROR
      );
      expect(toItemSaveError(new Error('x')).formError).toBe(ITEM_SAVE_CONNECTION_ERROR);
      expect(toItemSaveError(notFound)).toEqual({
        formError: 'This item no longer exists.',
        fieldErrors: {}
      });
    });
  });
});
