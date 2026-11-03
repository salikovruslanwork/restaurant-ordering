import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { PricingKind, type MenuItem } from '@restaurant/contracts';
import { menuFeature } from '@shared/data-access';
import { DIALOG_DATA, DialogRef } from '@shared/ui';
import type { ItemEditDialogData } from '@admin/models/item-edit-dialog.model';
import { ItemFormField, type ItemEdit } from '@admin/models/menu-editor.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';

import { ItemEditDialogComponent } from './item-edit-dialog.component';

const miso: MenuItem = {
  id: 'miso',
  categoryId: 'soup',
  name: 'Miso',
  description: 'Warm',
  pricing: { kind: PricingKind.Fixed, price: 450 },
  isAvailable: true,
  version: 1,
  updatedAt: '2026-11-01T00:00:00.000Z'
};
const editing: ItemEdit = { id: 'miso', isSaving: false, formError: null, fieldErrors: {} };

describe('ItemEditDialogComponent', () => {
  let fixture: ComponentFixture<ItemEditDialogComponent>;
  let store: MockStore;
  let close: ReturnType<typeof vi.fn>;

  const element = (): HTMLElement => fixture.nativeElement;
  const field = (label: string) => {
    const labelElement = [...element().querySelectorAll('label')].find(
      (candidate) => candidate.textContent?.trim() === label
    );
    return element().querySelector<HTMLInputElement>(`#${labelElement?.htmlFor}`);
  };
  const errors = () =>
    [...element().querySelectorAll('.text-field__error, .select__error')].map((error) =>
      error.textContent?.replace('error', '').trim()
    );
  const saveButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]');

  async function render(
    data: ItemEditDialogData = { item: miso, categoryId: null },
    edit: ItemEdit | null = editing,
    readOnly = false
  ): Promise<void> {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: menuEditorFeature.selectItemEdit, value: edit },
            { selector: selectIsReadOnly, value: readOnly },
            {
              selector: menuFeature.selectAllCategories,
              value: [{ id: 'soup', name: 'Soups', sortOrder: 0, version: 1 }]
            }
          ]
        }),
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(ItemEditDialogComponent);
    await fixture.whenStable();
  }

  async function setEdit(edit: ItemEdit | null): Promise<void> {
    store.overrideSelector(menuEditorFeature.selectItemEdit, edit);
    store.refreshState();
    await fixture.whenStable();
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label);
    if (!input) {
      throw new Error(`No field ${label}`);
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('fills the form from the item and focuses the name', async () => {
    await render();

    expect(element().querySelector('.dialog__title')?.textContent?.trim()).toBe('Edit item');
    expect(field('Name')?.value).toBe('Miso');
    expect(field('Description')?.value).toBe('Warm');
    expect(field('Price')?.value).toBe('4.50');
    expect(element().querySelector('.text-field__help')?.textContent).toBe('4 / 200');
    expect(document.activeElement).toBe(field('Name'));
  });

  it('starts a new item empty, in the given category', async () => {
    await render({ item: null, categoryId: 'soup' }, { ...editing, id: null });

    expect(element().querySelector('.dialog__title')?.textContent?.trim()).toBe('Add item');
    expect(field('Name')?.value).toBe('');
    expect(element().querySelector('select')?.selectedOptions[0]?.textContent?.trim()).toBe(
      'Soups'
    );
  });

  it('checks every field before saving', async () => {
    await render({ item: null, categoryId: null }, { ...editing, id: null });

    await submit();

    expect(errors()).toEqual(['Enter a name', 'Choose a category', 'Enter a price']);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('saves a trimmed request with the price in cents', async () => {
    await render();

    await type('Name', ' Red miso ');
    await type('Price', '5.25');
    await submit();

    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(
      menuEditorActions.saveItem({
        id: 'miso',
        request: {
          categoryId: 'soup',
          name: 'Red miso',
          description: 'Warm',
          pricing: { kind: PricingKind.Fixed, price: 525 },
          isAvailable: true
        }
      })
    );
  });

  it('drops the price for an open-price item and switches availability', async () => {
    await render();

    [...element().querySelectorAll<HTMLButtonElement>('app-segmented-button button')]
      .find((button) => button.textContent?.includes('Open price'))
      ?.click();
    element().querySelector<HTMLButtonElement>('[aria-label="Available on the menu"]')?.click();
    await fixture.whenStable();
    await type('Name', 'Miso');
    await submit();

    expect(field('Price')).toBeNull();
    expect(element().querySelector('.item-edit-dialog__note')).not.toBeNull();
    expect(store.dispatch).toHaveBeenCalledWith(
      menuEditorActions.saveItem({
        id: 'miso',
        request: expect.objectContaining({
          pricing: { kind: PricingKind.Open },
          isAvailable: false
        })
      })
    );
  });

  it('locks the form while saving and closes when the save is done', async () => {
    await render();

    await setEdit({ ...editing, isSaving: true });
    expect(element().querySelector('fieldset')?.disabled).toBe(true);
    expect(saveButton()?.getAttribute('aria-busy')).toBe('true');
    element().querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
    expect(close).not.toHaveBeenCalled();

    await setEdit(null);
    expect(close).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('shows server errors on their fields and at the top', async () => {
    await render();

    await setEdit({ ...editing, isSaving: true });
    await setEdit({
      ...editing,
      formError: 'This item no longer exists.',
      fieldErrors: { [ItemFormField.Name]: 'Name taken' }
    });

    expect(element().querySelector('.form-error')?.textContent).toContain(
      'This item no longer exists.'
    );
    expect(errors()).toEqual(['Name taken']);
    expect(element().querySelector('fieldset')?.disabled).toBe(false);
    expect(field('Price')?.disabled).toBe(false);
  });

  it('can’t save while read-only and says why', async () => {
    await render(undefined, editing, true);

    await submit();

    expect(saveButton()?.disabled).toBe(true);
    expect(element().querySelector('.form-error')?.textContent).toContain('You’re offline');
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('cancels with the button, the close icon or Escape', async () => {
    await render();

    [...element().querySelectorAll<HTMLButtonElement>('.dialog__actions button')]
      .find((button) => button.textContent?.trim() === 'Cancel')
      ?.click();
    element()
      .querySelector('form')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(store.dispatch).toHaveBeenCalledWith(menuEditorActions.cancelItemEdit());
    expect(close).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledWith(false);
  });
});
