import { inject, Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { filter, map, mergeMap, tap, timer } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import { realtimeActions } from '@shared/data-access';
import { DialogService, NotificationKind, NotificationService } from '@shared/ui';
import { MENU_FRESH_MS } from '@admin/config/items.config';
import { categoryBlockedDialog } from '@admin/helpers/category-dialogs';

import { menuEditorActions } from './menu-editor.actions';
import { menuEditorFeature } from './menu-editor.reducer';

@Injectable()
export class MenuEditorUiEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(DialogService);
  private readonly announcer = inject(LiveAnnouncer);

  announceCategorySaved$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.categorySaved),
        tap(({ category, isNew }) => {
          if (isNew) {
            this.notify(`Category “${category.name}” added`);
          } else {
            this.announce(`Renamed to ${category.name}`);
          }
        })
      ),
    { dispatch: false }
  );

  announceCategoryMoved$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.categoryMoved),
        tap(({ name, position }) => this.announce(`${name} moved to position ${position}`))
      ),
    { dispatch: false }
  );

  announceCategoryDeleted$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.categoryDeleted),
        tap(({ name }) => this.notify(`Category “${name}” deleted`))
      ),
    { dispatch: false }
  );

  reportCategoryMoveFailed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.categoryMoveFailed),
        tap(({ error }) => this.notify(error, NotificationKind.Error))
      ),
    { dispatch: false }
  );

  reportCategoryDeleteFailed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.categoryDeleteFailed),
        tap(({ error, isNotEmpty }) => {
          if (isNotEmpty) {
            this.dialog.confirm(categoryBlockedDialog(error));
          } else {
            this.notify(error, NotificationKind.Error);
          }
        })
      ),
    { dispatch: false }
  );

  announceItemSaved$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.itemSaved),
        tap(({ item, isNew }) => this.notify(`${item.name} ${isNew ? 'added' : 'saved'}`))
      ),
    { dispatch: false }
  );

  announceItemAvailability$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.itemAvailabilityChanged),
        tap(({ item }) =>
          this.announce(`${item.name} is now ${item.isAvailable ? 'available' : 'unavailable'}`)
        )
      ),
    { dispatch: false }
  );

  announceItemDeleted$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.itemDeleted),
        tap(({ name }) => this.notify(`${name} deleted`))
      ),
    { dispatch: false }
  );

  reportItemAvailabilityFailed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.itemAvailabilityFailed),
        tap(({ name, error }) =>
          this.notify(`Couldn’t update ${name}. ${error}`, NotificationKind.Error)
        )
      ),
    { dispatch: false }
  );

  reportItemDeleteFailed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(menuEditorActions.itemDeleteFailed),
        tap(({ error }) => this.notify(error, NotificationKind.Error))
      ),
    { dispatch: false }
  );

  endFresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        realtimeActions.eventReceived,
        menuEditorActions.itemSaved,
        menuEditorActions.itemAvailabilityChanged,
        menuEditorActions.categorySaved
      ),
      concatLatestFrom(() => this.store.select(menuEditorFeature.selectFreshIds)),
      filter(([, ids]) => ids.length > 0),
      mergeMap(([, ids]) =>
        timer(MENU_FRESH_MS).pipe(map(() => menuEditorActions.freshEnded({ ids })))
      )
    )
  );

  private notify(message: string, kind = NotificationKind.Info): void {
    this.notifications.show(message, { kind });
  }

  private announce(message: string): void {
    void this.announcer.announce(message);
  }
}
