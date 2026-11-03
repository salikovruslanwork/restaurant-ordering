import { inject, Injectable } from '@angular/core';

import { EMPTY, filter, map, merge, switchMap, throttleTime } from 'rxjs';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';

import { STREAM_RESTART_THROTTLE_MS } from '../../config/realtime.config';
import { RealtimeMessageKind, type RealtimeMessage } from '../../models/realtime.model';
import { RealtimeService } from '../../services/realtime.service';
import { connectionActions } from '../connection/connection.actions';
import { menuActions } from '../menu/menu.actions';
import { menuFeature } from '../menu/menu.reducer';
import { realtimeActions } from './realtime.actions';

function toAction(message: RealtimeMessage) {
  switch (message.kind) {
    case RealtimeMessageKind.Opened:
      return realtimeActions.streamOpened();
    case RealtimeMessageKind.Lost:
      return realtimeActions.streamLost();
    case RealtimeMessageKind.Envelope:
      return realtimeActions.eventReceived({ envelope: message.envelope });
  }
}

@Injectable()
export class RealtimeEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly realtime = inject(RealtimeService);

  // Every snapshot reopens the stream from its seq, so events the snapshot missed are replayed.
  // With no heartbeat visible to EventSource, a failed request is also the cue to reopen it.
  // Going offline closes it: an open stream would otherwise keep running (DevTools offline) or
  // linger dead until it errors, and `online` reopens it from the last seq.
  stream$ = createEffect(() => {
    const afterSnapshot$ = this.actions$.pipe(
      ofType(menuActions.loadSucceeded),
      map(({ snapshot }) => snapshot.seq)
    );
    const afterConnectionProblem$ = merge(
      this.actions$.pipe(ofType(connectionActions.browserOnline)),
      this.actions$.pipe(
        ofType(connectionActions.requestNoResponse),
        throttleTime(STREAM_RESTART_THROTTLE_MS)
      )
    ).pipe(
      concatLatestFrom(() => this.store.select(menuFeature.selectSeq)),
      map(([, seq]) => seq),
      filter((seq) => seq !== null)
    );

    const offline$ = this.actions$.pipe(
      ofType(connectionActions.browserOffline),
      map(() => null)
    );

    return merge(afterSnapshot$, afterConnectionProblem$, offline$).pipe(
      switchMap((since) => (since === null ? EMPTY : this.realtime.connect(since))),
      map(toAction)
    );
  });
}
