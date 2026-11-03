import { DOCUMENT, inject, Injectable } from '@angular/core';

import { EMPTY, fromEvent, map, merge, of } from 'rxjs';

import { createEffect } from '@ngrx/effects';

import { connectionActions } from './connection.actions';

@Injectable()
export class ConnectionEffects {
  private readonly window = inject(DOCUMENT).defaultView;

  browserStatus$ = createEffect(() =>
    this.window
      ? merge(
          this.window.navigator.onLine ? EMPTY : of(connectionActions.browserOffline()),
          fromEvent(this.window, 'online').pipe(map(() => connectionActions.browserOnline())),
          fromEvent(this.window, 'offline').pipe(map(() => connectionActions.browserOffline()))
        )
      : EMPTY
  );
}
