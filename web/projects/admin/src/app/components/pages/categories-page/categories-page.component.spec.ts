import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { EMPTY, of } from 'rxjs';

import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { LoadStatus, menuActions, menuFeature } from '@shared/data-access';
import { DialogService } from '@shared/ui';
import type { CategoryRow } from '@admin/models/category-list.model';
import { MoveDirection, type CategoryEdit } from '@admin/models/menu-editor.model';
import { selectIsReadOnly } from '@admin/store/connection/connection.selectors';
import { menuEditorActions } from '@admin/store/menu-editor/menu-editor.actions';
import { menuEditorFeature } from '@admin/store/menu-editor/menu-editor.reducer';
import { selectCategoryRows } from '@admin/store/menu-editor/menu-editor.selectors';

import { CategoriesPageComponent } from './categories-page.component';

const rows: CategoryRow[] = [
  { id: 'soup', name: 'Soups', itemCount: 3 },
  { id: 'tea', name: 'Tea', itemCount: 0 }
];

describe('CategoriesPageComponent', () => {
  let fixture: ComponentFixture<CategoriesPageComponent>;
  let store: MockStore;
  let open: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let answer: boolean;

  const element = (): HTMLElement => fixture.nativeElement;
  const addButton = () => element().querySelector<HTMLButtonElement>('.admin-page__actions button');
  const button = (label: string) =>
    element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  async function render(
    options: {
      status?: LoadStatus;
      categories?: CategoryRow[];
      edit?: CategoryEdit | null;
      readOnly?: boolean;
    } = {}
  ): Promise<void> {
    answer = true;
    open = vi.fn(() => ({ closed$: of(answer) }));
    confirm = vi.fn(() => (answer ? of(true) : EMPTY));
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectCategoryRows, value: options.categories ?? rows },
            { selector: menuFeature.selectLoadStatus, value: options.status ?? LoadStatus.Loaded },
            { selector: menuEditorFeature.selectCategoryEdit, value: options.edit ?? null },
            { selector: menuEditorFeature.selectBusyCategoryIds, value: [] },
            { selector: selectIsReadOnly, value: options.readOnly ?? false }
          ]
        }),
        { provide: DialogService, useValue: { open, confirm } }
      ]
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CategoriesPageComponent);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.resetSelectors();
  });

  it('shows the title, the count and the list', async () => {
    await render();

    expect(element().querySelector('h1')?.textContent).toBe('Categories');
    expect(element().querySelector('.admin-page__meta')?.textContent?.trim()).toBe(
      '2 categories · shown on the menu in this order'
    );
    expect(element().querySelectorAll('li.category-list__row')).toHaveLength(2);
  });

  it('shows skeletons and no count while the first load runs', async () => {
    await render({ status: LoadStatus.Loading, categories: [] });

    expect(element().querySelector('.category-list__status')).not.toBeNull();
    expect(element().querySelector('.admin-page__meta')?.textContent?.trim()).toBe('');
    expect(addButton()?.disabled).toBe(true);
  });

  it('shows an error with retry when the first load fails', async () => {
    await render({ status: LoadStatus.Failed, categories: [] });

    expect(element().querySelector('.error-state__text')?.textContent).toBe(
      'We couldn’t load categories. Check your connection and try again.'
    );
    element().querySelector<HTMLButtonElement>('.error-state button')?.click();

    expect(store.dispatch).toHaveBeenCalledWith(menuActions.load());
  });

  it('starts adding a category, once', async () => {
    await render();

    addButton()?.click();
    expect(store.dispatch).toHaveBeenCalledWith(menuEditorActions.startCategoryEdit({ id: null }));

    store.overrideSelector(menuEditorFeature.selectCategoryEdit, {
      id: null,
      isSaving: false,
      error: null
    });
    store.refreshState();
    await fixture.whenStable();
    expect(addButton()?.disabled).toBe(true);
  });

  it('can’t add while read-only', async () => {
    await render({ readOnly: true });

    expect(addButton()?.disabled).toBe(true);
  });

  it('passes list events on as actions', async () => {
    await render({ edit: { id: 'tea', isSaving: false, error: null } });

    button('Rename Soups')?.click();
    button('Move Soups down')?.click();
    element()
      .querySelector<HTMLButtonElement>('.category-list__form app-button:first-child button')
      ?.click();
    element()
      .querySelector('.category-list__form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(vi.mocked(store.dispatch).mock.calls.map(([action]) => action)).toEqual([
      menuEditorActions.startCategoryEdit({ id: 'soup' }),
      menuEditorActions.moveCategory({ id: 'soup', direction: MoveDirection.Down }),
      menuEditorActions.cancelCategoryEdit(),
      menuEditorActions.saveCategory({ id: 'tea', name: 'Tea' })
    ]);
  });

  it('explains that a category with items can’t be deleted', async () => {
    await render();

    button('Delete Soups')?.click();

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        text: "Can't delete 'Soups' — it still has 3 items. Move or delete them first.",
        confirmLabel: 'OK'
      })
    );
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('deletes an empty category after confirmation', async () => {
    await render();

    button('Delete Tea')?.click();

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete “Tea”?', isDanger: true })
    );
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(
      menuEditorActions.deleteCategory({ id: 'tea', name: 'Tea' })
    );
  });

  it('keeps the category when the deletion is declined', async () => {
    await render();
    answer = false;

    button('Delete Tea')?.click();

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
