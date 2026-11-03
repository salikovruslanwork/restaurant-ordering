import type { FormControl } from '@angular/forms';

import type { Id, MenuItem, PricingKind } from '@restaurant/contracts';

import type { ItemFormField } from './menu-editor.model';

export interface ItemEditDialogData {
  item: MenuItem | null;
  categoryId: Id | null;
}

export interface ItemForm {
  name: FormControl<string>;
  description: FormControl<string>;
  categoryId: FormControl<Id | null>;
  pricingKind: FormControl<PricingKind>;
  price: FormControl<string>;
  isAvailable: FormControl<boolean>;
}

export interface ItemFormValue {
  name: string;
  description: string;
  categoryId: Id | null;
  pricingKind: PricingKind;
  price: string;
  isAvailable: boolean;
}

export interface ItemSaveError {
  formError: string | null;
  fieldErrors: Partial<Record<ItemFormField, string>>;
}
