import { inject, Injectable } from '@angular/core';

import { filter, map, switchMap } from 'rxjs';

import { Actions, createEffect, ofType, type OnInitEffects } from '@ngrx/effects';
import { concatLatestFrom, mapResponse } from '@ngrx/operators';
import { Store, type Action } from '@ngrx/store';

import { ServerEventType } from '@restaurant/contracts';

import { requestErrorMessage } from '../../helpers/request-error';
import { LoadStatus } from '../../models/menu.model';
import { MenuApiService } from '../../services/menu-api.service';
import { connectionActions } from '../connection/connection.actions';
import { realtimeActions } from '../realtime/realtime.actions';
import { menuActions } from './menu.actions';
import { menuFeature } from './menu.reducer';

@Injectable()
export class MenuEffects implements OnInitEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(MenuApiService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(menuActions.load),
      switchMap(() =>
        this.api.getMenu().pipe(
          mapResponse({
            next: (snapshot) => menuActions.loadSucceeded({ snapshot }),
            error: (error) => menuActions.loadFailed({ message: requestErrorMessage(error) })
          })
        )
      )
    )
  );

  reloadOnResync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(realtimeActions.eventReceived),
      filter(({ envelope }) => envelope.event.type === ServerEventType.Resync),
      map(() => menuActions.load())
    )
  );

  retryWhenOnline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectionActions.browserOnline),
      concatLatestFrom(() => this.store.select(menuFeature.selectLoadStatus)),
      filter(([, status]) => status === LoadStatus.Failed),
      map(() => menuActions.load())
    )
  );

  ngrxOnInitEffects(): Action {
    return menuActions.load();
  }
}
