import { TestBed } from '@angular/core/testing';

import { of, ReplaySubject, Subject, throwError, type Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { ApiErrorCode, type ApiError, type Category } from '@restaurant/contracts';
import { menuActions, MenuApiService, menuFeature, RequestError } from '@shared/data-access';
import { CATEGORY_MOVE_ERROR } from '@admin/config/categories.config';
import { MoveDirection } from '@admin/models/menu-editor.model';

import { MenuEditorCategoriesEffects } from './menu-editor-categories.effects';
import { menuEditorActions } from './menu-editor.actions';

const soup: Category = { id: 'soup', name: 'Soup', sortOrder: 0, version: 1 };
const tea: Category = { id: 'tea', name: 'Tea', sortOrder: 4, version: 1 };

function apiError(status: number, error: ApiError): RequestError {
  return new RequestError(status, error, error.message);
}

describe('MenuEditorCategoriesEffects', () => {
  let actions$: ReplaySubject<Action>;
  let createCategory: ReturnType<typeof vi.fn>;
  let updateCategory: ReturnType<typeof vi.fn>;
  let deleteCategory: ReturnType<typeof vi.fn>;

  function create(): MenuEditorCategoriesEffects {
    TestBed.configureTestingModule({
      providers: [
        MenuEditorCategoriesEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [{ selector: menuFeature.selectAllCategories, value: [soup, tea] }]
        }),
        { provide: MenuApiService, useValue: { createCategory, updateCategory, deleteCategory } }
      ]
    });
    return TestBed.inject(MenuEditorCategoriesEffects);
  }

  function collect(effect$: Observable<Action>): Action[] {
    const received: Action[] = [];
    effect$.subscribe((action) => received.push(action));
    return received;
  }

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    createCategory = vi.fn((request: { name: string }) =>
      of({ id: 'new', name: request.name, sortOrder: 5, version: 1 })
    );
    updateCategory = vi.fn((id: string, request: Partial<Category>) =>
      of({ ...(id === 'soup' ? soup : tea), ...request, version: 2 })
    );
    deleteCategory = vi.fn(() => of(undefined));
  });

  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  describe('save', () => {
    it('creates a new category and applies it to the menu', () => {
      const received = collect(create().saveCategory$);

      actions$.next(menuEditorActions.saveCategory({ id: null, name: 'Desserts' }));

      const category = { id: 'new', name: 'Desserts', sortOrder: 5, version: 1 };
      expect(createCategory).toHaveBeenCalledWith({ name: 'Desserts' });
      expect(received).toEqual([
        menuActions.categorySaved({ category }),
        menuEditorActions.categorySaved({ category, isNew: true })
      ]);
    });

    it('renames an existing category', () => {
      const received = collect(create().saveCategory$);

      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'Teas' }));

      expect(updateCategory).toHaveBeenCalledWith('tea', { name: 'Teas' });
      expect(received[1]).toEqual(
        menuEditorActions.categorySaved({
          category: { ...tea, name: 'Teas', version: 2 },
          isNew: false
        })
      );
    });

    it('shows the server’s message for the name field', () => {
      updateCategory = vi.fn(() =>
        throwError(() =>
          apiError(400, {
            code: ApiErrorCode.Validation,
            message: 'Check the form',
            fields: { name: ['A category with this name already exists'] }
          })
        )
      );
      const received = collect(create().saveCategory$);

      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'Soup' }));

      expect(received).toEqual([
        menuEditorActions.categorySaveFailed({ error: 'A category with this name already exists' })
      ]);
    });

    it('falls back to the general message for other errors', () => {
      updateCategory = vi.fn(() =>
        throwError(() =>
          apiError(400, { code: ApiErrorCode.Validation, message: 'Check the form', fields: {} })
        )
      );
      const received = collect(create().saveCategory$);
      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'x' }));

      updateCategory.mockReturnValue(
        throwError(() => new RequestError(0, null, 'We couldn’t reach the server.'))
      );
      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'x' }));

      expect(received).toEqual([
        menuEditorActions.categorySaveFailed({ error: 'Check the form' }),
        menuEditorActions.categorySaveFailed({ error: 'We couldn’t reach the server.' })
      ]);
    });

    it('ignores a second save while the first is running', () => {
      const response$ = new Subject<Category>();
      updateCategory = vi.fn(() => response$);
      const received = collect(create().saveCategory$);

      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'Teas' }));
      actions$.next(menuEditorActions.saveCategory({ id: 'tea', name: 'Teas' }));
      response$.next(tea);
      response$.complete();

      expect(updateCategory).toHaveBeenCalledOnce();
      expect(received).toHaveLength(2);
    });
  });

  describe('move', () => {
    it('swaps the sort order with the neighbour, one request after the other', () => {
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up }));

      expect(updateCategory.mock.calls).toEqual([
        ['tea', { sortOrder: 0 }],
        ['soup', { sortOrder: 4 }]
      ]);
      expect(received).toEqual([
        menuActions.categorySaved({ category: { ...tea, sortOrder: 0, version: 2 } }),
        menuActions.categorySaved({ category: { ...soup, sortOrder: 4, version: 2 } }),
        menuEditorActions.categoryMoved({ id: 'tea', name: 'Tea', position: 1 })
      ]);
    });

    it('moves down too', () => {
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'soup', direction: MoveDirection.Down }));

      expect(received.at(-1)).toEqual(
        menuEditorActions.categoryMoved({ id: 'soup', name: 'Soup', position: 2 })
      );
    });

    it('undoes the first change when the second request fails', () => {
      updateCategory = vi
        .fn()
        .mockReturnValueOnce(of({ ...tea, sortOrder: 0, version: 2 }))
        .mockReturnValueOnce(throwError(() => new RequestError(0, null, 'Offline')))
        .mockReturnValueOnce(of({ ...tea, sortOrder: 4, version: 3 }));
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up }));

      expect(updateCategory.mock.calls).toEqual([
        ['tea', { sortOrder: 0 }],
        ['soup', { sortOrder: 4 }],
        ['tea', { sortOrder: 4 }]
      ]);
      expect(received).toEqual([
        menuActions.categorySaved({ category: { ...tea, sortOrder: 4, version: 3 } }),
        menuEditorActions.categoryMoveFailed({ id: 'tea', error: 'Offline' })
      ]);
    });

    it('shows the half-done move when the undo fails too', () => {
      updateCategory = vi
        .fn()
        .mockReturnValueOnce(of({ ...tea, sortOrder: 0, version: 2 }))
        .mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up }));

      expect(received).toEqual([
        menuActions.categorySaved({ category: { ...tea, sortOrder: 0, version: 2 } }),
        menuEditorActions.categoryMoveFailed({ id: 'tea', error: 'Offline' })
      ]);
    });

    it('reports a failed first request without further requests', () => {
      updateCategory = vi.fn(() => throwError(() => new RequestError(0, null, 'Offline')));
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'tea', direction: MoveDirection.Up }));

      expect(updateCategory).toHaveBeenCalledOnce();
      expect(received).toEqual([
        menuEditorActions.categoryMoveFailed({ id: 'tea', error: 'Offline' })
      ]);
    });

    it('fails without a request when there is no neighbour', () => {
      const received = collect(create().moveCategory$);

      actions$.next(menuEditorActions.moveCategory({ id: 'soup', direction: MoveDirection.Up }));
      actions$.next(menuEditorActions.moveCategory({ id: 'gone', direction: MoveDirection.Down }));

      expect(updateCategory).not.toHaveBeenCalled();
      expect(received).toEqual([
        menuEditorActions.categoryMoveFailed({ id: 'soup', error: CATEGORY_MOVE_ERROR }),
        menuEditorActions.categoryMoveFailed({ id: 'gone', error: CATEGORY_MOVE_ERROR })
      ]);
    });
  });

  describe('delete', () => {
    it('deletes and removes the category from the menu', () => {
      const received = collect(create().deleteCategory$);

      actions$.next(menuEditorActions.deleteCategory({ id: 'soup', name: 'Soup' }));

      expect(deleteCategory).toHaveBeenCalledWith('soup');
      expect(received).toEqual([
        menuActions.categoryRemoved({ id: 'soup' }),
        menuEditorActions.categoryDeleted({ id: 'soup', name: 'Soup' })
      ]);
    });

    it('tells a category with new items apart from other errors', () => {
      const notEmpty = "Can't delete 'Soup' — it still has 1 item. Move or delete them first.";
      deleteCategory = vi.fn(() =>
        throwError(() => apiError(409, { code: ApiErrorCode.CategoryNotEmpty, message: notEmpty }))
      );
      const received = collect(create().deleteCategory$);
      actions$.next(menuEditorActions.deleteCategory({ id: 'soup', name: 'Soup' }));

      deleteCategory.mockReturnValue(throwError(() => new RequestError(0, null, 'Offline')));
      actions$.next(menuEditorActions.deleteCategory({ id: 'tea', name: 'Tea' }));

      expect(received).toEqual([
        menuEditorActions.categoryDeleteFailed({ id: 'soup', error: notEmpty, isNotEmpty: true }),
        menuEditorActions.categoryDeleteFailed({ id: 'tea', error: 'Offline', isNotEmpty: false })
      ]);
    });
  });
});
