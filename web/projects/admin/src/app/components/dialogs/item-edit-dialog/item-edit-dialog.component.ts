import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { map } from 'rxjs';

import { Store } from '@ngrx/store';

import { PricingKind, type Category } from '@restaurant/contracts';
import { menuFeature } from '@shared/data-access';
import {
  ButtonComponent,
  ButtonVariant,
  DIALOG,
  DIALOG_DATA,
  DialogRef,
  DialogSize,
  FormErrorComponent,
  moneyValidator,
  SegmentedButtonComponent,
  SelectComponent,
  SwitchComponent,
  TextFieldComponent,
  TextFieldType,
  type SelectOption
} from '@shared/ui';
import {
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_FIELD_ERRORS,
  ITEM_MAX_PRICE_CENTS,
  ITEM_NAME_MAX_LENGTH,
  ITEM_OPEN_PRICE_NOTE,
  ITEM_SAVE_OFFLINE_NOTE,
  PRICING_OPTIONS
} from '@admin/config/items.config';
import { toItemFormValue, toItemRequest, trimmedName } from '@admin/helpers/item-form';
import type { ItemEditDialogData, ItemForm } from '@admin/models/item-edit-dialog.model';
import { ItemFormField, type ItemEdit } from '@admin/models/menu-editor.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';

@Component({
  selector: 'app-item-edit-dialog',
  imports: [
    ...DIALOG,
    ButtonComponent,
    FormErrorComponent,
    ReactiveFormsModule,
    SegmentedButtonComponent,
    SelectComponent,
    SwitchComponent,
    TextFieldComponent
  ],
  templateUrl: './item-edit-dialog.component.html',
  styleUrl: './item-edit-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemEditDialogComponent {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<ItemEditDialogData>(DIALOG_DATA);
  private readonly store = inject(Store);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private wasSaving = false;

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly TextFieldType = TextFieldType;
  protected readonly DialogSize = DialogSize;
  protected readonly PricingKind = PricingKind;
  protected readonly ItemFormField = ItemFormField;
  protected readonly fieldErrors = ITEM_FIELD_ERRORS;
  protected readonly pricingOptions = PRICING_OPTIONS;
  protected readonly openPriceNote = ITEM_OPEN_PRICE_NOTE;
  protected readonly offlineNote = ITEM_SAVE_OFFLINE_NOTE;
  protected readonly title = this.data.item ? 'Edit item' : 'Add item';

  protected readonly form = this.createForm();
  protected readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue()
    }
  );

  protected readonly edit = this.store.selectSignal(menuEditorFeature.selectItemEdit);
  protected readonly isReadOnly = this.store.selectSignal(selectIsReadOnly);
  private readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);

  protected readonly isSaving = computed(() => this.edit()?.isSaving ?? false);
  protected readonly formError = computed(() => this.edit()?.formError ?? null);
  protected readonly categoryOptions = computed(() => this.toOptions(this.categories()));
  protected readonly descriptionHint = computed(
    () => `${this.value().description.length} / ${ITEM_DESCRIPTION_MAX_LENGTH}`
  );

  constructor() {
    this.syncPriceControl(this.form.controls.pricingKind.value);
    effect(() => this.syncEdit(this.edit()));
    this.focus('input');
  }

  protected setPricingKind(kind: PricingKind): void {
    this.form.controls.pricingKind.setValue(kind);
    this.syncPriceControl(kind);
  }

  protected setAvailable(isAvailable: boolean): void {
    this.form.controls.isAvailable.setValue(isAvailable);
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focus('[aria-invalid="true"]');
      return;
    }
    const edit = this.edit();
    if (!edit || edit.isSaving || this.isReadOnly()) {
      return;
    }
    this.store.dispatch(
      menuEditorActions.saveItem({ id: edit.id, request: toItemRequest(this.form.getRawValue()) })
    );
  }

  protected close(): void {
    if (this.isSaving()) {
      return;
    }
    this.store.dispatch(menuEditorActions.cancelItemEdit());
    this.ref.close(false);
  }

  private createForm(): FormGroup<ItemForm> {
    const value = toItemFormValue(this.data.item, this.data.categoryId);
    return new FormGroup<ItemForm>({
      name: new FormControl(value.name, {
        nonNullable: true,
        validators: trimmedName(ITEM_NAME_MAX_LENGTH)
      }),
      description: new FormControl(value.description, {
        nonNullable: true,
        validators: Validators.maxLength(ITEM_DESCRIPTION_MAX_LENGTH)
      }),
      categoryId: new FormControl(value.categoryId, { validators: Validators.required }),
      pricingKind: new FormControl(value.pricingKind, { nonNullable: true }),
      price: new FormControl(value.price, {
        nonNullable: true,
        validators: moneyValidator(() => ITEM_MAX_PRICE_CENTS)
      }),
      isAvailable: new FormControl(value.isAvailable, { nonNullable: true })
    });
  }

  // A disabled control skips validation and stays out of the request.
  private syncPriceControl(kind: PricingKind): void {
    const price = this.form.controls.price;
    if (kind === PricingKind.Fixed && !this.isSaving()) {
      price.enable();
    } else {
      price.disable();
    }
  }

  private syncEdit(edit: ItemEdit | null): void {
    if (!edit) {
      if (this.wasSaving) {
        this.ref.close(true);
      }
      return;
    }
    this.wasSaving = edit.isSaving;
    if (edit.isSaving) {
      this.form.disable();
      return;
    }
    this.form.enable();
    this.syncPriceControl(this.form.controls.pricingKind.value);
    const fields = Object.entries(edit.fieldErrors);
    for (const [field, message] of fields) {
      const control = this.form.get(field);
      control?.setErrors({ server: message });
      control?.markAsTouched();
    }
    if (fields.length > 0) {
      this.focus('[aria-invalid="true"]');
    }
  }

  private toOptions(categories: Category[]): SelectOption<string>[] {
    return categories.map(({ id, name }) => ({ value: id, label: name }));
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector
    });
  }
}
