import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { EMPTY, of } from 'rxjs';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { PricingKind, type MenuItem } from '@restaurant/contracts';
import { LoadStatus, menuActions, menuFeature } from '@shared/data-access';
import { DialogService, DialogSize, LayoutService } from '@shared/ui';
import { ItemEditDialogComponent } from '@admin/components/dialogs/item-edit-dialog/item-edit-dialog.component';
import type { ItemList, ItemRow } from '@admin/models/item-list.model';
import { AvailabilityFilter } from '@admin/models/menu-editor.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import {
  selectActiveItemFilter,
  selectItemList
} from '@admin/store/menu-editor/menu-editor.selectors';

import { ItemsPageComponent } from './items-page.component';

const miso: MenuItem = {
  id: 'miso',
  categoryId: 'soup',
  name: 'Miso',
  description: '',
  pricing: { kind: PricingKind.Fixed, price: 450 },
  isAvailable: true,
  version: 1,
  updatedAt: '2026-11-01T00:00:00.000Z'
};
const row: ItemRow = {
  id: 'miso',
  name: 'Miso',
  description: '',
  categoryName: 'Soups',
  pricing: miso.pricing,
  isAvailable: true,
  isSaving: false,
  isDeleting: false
};

describe('ItemsPageComponent', () => {
  let fixture: ComponentFixture<ItemsPageComponent>;
  let store: MockStore;
  let open: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let answer: boolean;

  const element = (): HTMLElement => fixture.nativeElement;
  const meta = () =>
    element().querySelector('.admin-page__meta')?.textContent?.replace(/\s+/g, ' ').trim();

  async function render(
    options: { list?: ItemList; status?: LoadStatus; mobile?: boolean; readOnly?: boolean } = {}
  ): Promise<void> {
    answer = true;
    open = vi.fn(() => ({ closed$: of(answer) }));
    confirm = vi.fn(() => (answer ? of(true) : EMPTY));
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectItemList, value: options.list ?? { rows: [row], total: 1 } },
            { selector: menuFeature.selectLoadStatus, value: options.status ?? LoadStatus.Loaded },
            {
              selector: menuFeature.selectAllCategories,
              value:
                options.status === LoadStatus.Loaded || !options.status
                  ? [{ id: 'soup', name: 'Soups', sortOrder: 0, version: 1 }]
                  : []
            },
            { selector: menuFeature.selectItemEntities, value: { miso } },
            {
              selector: selectActiveItemFilter,
              value: { categoryId: 'soup', availability: AvailabilityFilter.All }
            },
            { selector: selectIsReadOnly, value: options.readOnly ?? false }
          ]
        }),
        { provide: DialogService, useValue: { open, confirm } },
        { provide: LayoutService, useValue: { isMobile: signal(options.mobile ?? false) } }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(ItemsPageComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('shows the count, toolbar and table on desktop', async () => {
    await render();

    expect(element().querySelector('h1')?.textContent).toBe('Items');
    expect(meta()).toBe('1 item');
    expect(element().querySelector('app-items-table')).not.toBeNull();
    expect(element().querySelector('app-item-admin-card')).toBeNull();
  });

  it('counts filtered items out of all', async () => {
    await render({ list: { rows: [row], total: 5000 } });

    expect(meta()).toBe('1 of 5000 items');
  });

  it('shows cards instead of the table on mobile', async () => {
    await render({ mobile: true });

    expect(element().querySelector('app-items-table')).toBeNull();
    expect(element().querySelector('app-item-admin-card')).not.toBeNull();
    expect(element().querySelector('.items-page__fab button')?.getAttribute('aria-label')).toBe(
      'Add item'
    );
  });

  it('shows skeletons while loading', async () => {
    await render({ status: LoadStatus.Loading, list: { rows: [], total: 0 } });

    expect(element().querySelector('.items-page__skeleton')).not.toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent).toBe('Loading…');
  });

  it('shows an error with retry when the first load fails', async () => {
    await render({ status: LoadStatus.Failed, list: { rows: [], total: 0 } });

    expect(element().querySelector('app-items-toolbar')).toBeNull();
    element().querySelector<HTMLButtonElement>('.error-state button')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(menuActions.load());
  });

  it('offers to clear filters when nothing matches', async () => {
    await render({ list: { rows: [], total: 10 } });

    expect(element().querySelector('.empty-state__title')?.textContent).toBe(
      'No items match these filters'
    );
    element().querySelector<HTMLButtonElement>('.empty-state button')?.click();
    expect(store.dispatch).toHaveBeenCalledWith(menuEditorActions.clearItemFilters());
  });

  it('says when there are no items at all', async () => {
    await render({ list: { rows: [], total: 0 } });

    expect(element().querySelector('.empty-state__title')?.textContent).toBe('No items yet');
  });

  it('opens the editor for a new item in the filtered category', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('.items-toolbar__add button')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(menuEditorActions.startItemEdit({ id: null }));
    expect(open).toHaveBeenCalledWith(ItemEditDialogComponent, {
      data: { item: null, categoryId: 'soup' },
      size: DialogSize.Form,
      disableClose: true
    });
  });

  it('opens the editor for an existing item', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('button[aria-label="Edit Miso"]')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(menuEditorActions.startItemEdit({ id: 'miso' }));
    expect(open).toHaveBeenCalledWith(
      ItemEditDialogComponent,
      expect.objectContaining({ data: { item: miso, categoryId: 'soup' } })
    );
  });

  it('changes availability', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('[aria-label="Miso available"]')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      menuEditorActions.changeItemAvailability({ id: 'miso', isAvailable: false })
    );
  });

  it('deletes after confirmation only', async () => {
    await render();
    const remove = () =>
      element().querySelector<HTMLButtonElement>('button[aria-label="Delete Miso"]')?.click();

    answer = false;
    remove();
    expect(store.dispatch).not.toHaveBeenCalled();

    answer = true;
    remove();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete “Miso”?', cancelLabel: 'Keep item' })
    );
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(
      menuEditorActions.deleteItem({ id: 'miso', name: 'Miso' })
    );
  });

  it('passes filter changes on', async () => {
    await render();

    [...element().querySelectorAll<HTMLButtonElement>('app-segmented-button button')]
      .find((button) => button.textContent?.includes('Unavailable'))
      ?.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      menuEditorActions.filterItemsByAvailability({ availability: AvailabilityFilter.Unavailable })
    );
  });

  it('turns adding off while read-only', async () => {
    await render({ readOnly: true });

    expect(element().querySelector<HTMLButtonElement>('.items-toolbar__add button')?.disabled).toBe(
      true
    );
  });
});
