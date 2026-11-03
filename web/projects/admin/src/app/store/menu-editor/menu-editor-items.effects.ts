import { inject, Injectable } from '@angular/core';

import { catchError, exhaustMap, mergeMap, of, type Observable } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store, type Action } from '@ngrx/store';

import type { CreateItemRequest, Id } from '@restaurant/contracts';
import { menuActions, MenuApiService, menuFeature, requestErrorMessage } from '@shared/data-access';
import { toItemSaveError } from '@admin/helpers/item-form';

import { menuEditorActions } from './menu-editor.actions';

@Injectable()
export class MenuEditorItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MenuApiService);

  saveItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.saveItem),
      exhaustMap(({ id, request }) => this.save(id, request))
    )
  );

  changeItemAvailability$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.changeItemAvailability),
      concatLatestFrom(() => this.store.select(menuFeature.selectItemEntities)),
      mergeMap(([{ id, isAvailable }, items]) =>
        this.changeAvailability(id, isAvailable, items[id]?.name ?? '')
      )
    )
  );

  deleteItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuEditorActions.deleteItem),
      mergeMap(({ id, name }) => this.delete(id, name))
    )
  );

  private save(id: Id | null, request: CreateItemRequest): Observable<Action> {
    const request$ = id ? this.api.updateItem(id, request) : this.api.createItem(request);

    return request$.pipe(
      mergeMap((item) => [
        menuActions.itemSaved({ item }),
        menuEditorActions.itemSaved({ item, isNew: id === null })
      ]),
      catchError((error: unknown) =>
        of(menuEditorActions.itemSaveFailed({ error: toItemSaveError(error) }))
      )
    );
  }

  private changeAvailability(id: Id, isAvailable: boolean, name: string): Observable<Action> {
    return this.api.updateItem(id, { isAvailable }).pipe(
      mergeMap((item) => [
        menuActions.itemSaved({ item }),
        menuEditorActions.itemAvailabilityChanged({ item })
      ]),
      catchError((error: unknown) =>
        of(
          menuEditorActions.itemAvailabilityFailed({
            id,
            name,
            error: requestErrorMessage(error)
          })
        )
      )
    );
  }

  private delete(id: Id, name: string): Observable<Action> {
    return this.api.deleteItem(id).pipe(
      mergeMap(() => [
        menuActions.itemRemoved({ id }),
        menuEditorActions.itemDeleted({ id, name })
      ]),
      catchError((error: unknown) =>
        of(menuEditorActions.itemDeleteFailed({ id, error: requestErrorMessage(error) }))
      )
    );
  }
}
