import { inject, Injectable } from '@angular/core';

import {
  catchError,
  concatMap,
  endWith,
  exhaustMap,
  map,
  mergeMap,
  of,
  type Observable
} from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store, type Action } from '@ngrx/store';

import { ApiErrorCode, type Category, type Id } from '@restaurant/contracts';
import {
  menuActions,
  MenuApiService,
  menuFeature,
  RequestError,
  requestErrorMessage
} from '@shared/data-access';
import { CATEGORY_MOVE_ERROR } from '@admin/config/categories.config';
import { MoveDirection } from '@admin/models/menu-editor.model';

import { menuEditorActions } from './menu-editor.actions';

@Injectable()
export class MenuEditorCategoriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MenuApiService);

  saveCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.saveCategory),
      exhaustMap(({ id, name }) => this.save(id, name))
    )
  );

  moveCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.moveCategory),
      concatLatestFrom(() => this.store.select(menuFeature.selectAllCategories)),
      concatMap(([{ id, direction }, categories]) => this.move(id, direction, categories))
    )
  );

  deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.deleteCategory),
      mergeMap(({ id, name }) => this.delete(id, name))
    )
  );

  private save(id: Id | null, name: string): Observable<Action> {
    const request$ = id ? this.api.updateCategory(id, { name }) : this.api.createCategory({ name });

    return request$.pipe(
      mergeMap((category) => [
        menuActions.categorySaved({ category }),
        menuEditorActions.categorySaved({ category, isNew: id === null })
      ]),
      catchError((error: unknown) =>
        of(menuEditorActions.categorySaveFailed({ error: this.getNameError(error) }))
      )
    );
  }

  private move(id: Id, direction: MoveDirection, categories: Category[]): Observable<Action> {
    const index = categories.findIndex((category) => category.id === id);
    const target = index + (direction === MoveDirection.Up ? -1 : 1);
    const moved = categories[index];
    const neighbour = categories[target];
    if (!moved || !neighbour) {
      return of(menuEditorActions.categoryMoveFailed({ id, error: CATEGORY_MOVE_ERROR }));
    }
    return this.swap(moved, neighbour, target + 1);
  }

  // Two PATCHes, one after the other. If the second fails, the first is undone, so two
  // categories never share a position.
  private swap(moved: Category, neighbour: Category, position: number): Observable<Action> {
    const saved = (category: Category) => menuActions.categorySaved({ category });
    const failed = (error: unknown) =>
      menuEditorActions.categoryMoveFailed({ id: moved.id, error: requestErrorMessage(error) });

    return this.api.updateCategory(moved.id, { sortOrder: neighbour.sortOrder }).pipe(
      concatMap((first) =>
        this.api.updateCategory(neighbour.id, { sortOrder: moved.sortOrder }).pipe(
          mergeMap((second) => [
            saved(first),
            saved(second),
            menuEditorActions.categoryMoved({ id: moved.id, name: moved.name, position })
          ]),
          catchError((error: unknown) =>
            this.api.updateCategory(moved.id, { sortOrder: moved.sortOrder }).pipe(
              map(saved),
              catchError(() => of(saved(first))),
              endWith(failed(error))
            )
          )
        )
      ),
      catchError((error: unknown) => of(failed(error)))
    );
  }

  private delete(id: Id, name: string): Observable<Action> {
    return this.api.deleteCategory(id).pipe(
      mergeMap(() => [
        menuActions.categoryRemoved({ id }),
        menuEditorActions.categoryDeleted({ id, name })
      ]),
      catchError((error: unknown) =>
        of(
          menuEditorActions.categoryDeleteFailed({
            id,
            error: requestErrorMessage(error),
            isNotEmpty: this.isCategoryNotEmpty(error)
          })
        )
      )
    );
  }

  private getNameError(error: unknown): string {
    if (error instanceof RequestError && error.apiError?.code === ApiErrorCode.Validation) {
      return error.apiError.fields['name']?.[0] ?? error.message;
    }
    return requestErrorMessage(error);
  }

  private isCategoryNotEmpty(error: unknown): boolean {
    return error instanceof RequestError && error.apiError?.code === ApiErrorCode.CategoryNotEmpty;
  }
}
