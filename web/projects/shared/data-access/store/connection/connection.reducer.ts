import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { ConnectionStatus, type ConnectionState } from '../../models/connection.model';
import { realtimeActions } from '../realtime/realtime.actions';
import { connectionActions } from './connection.actions';

const initialState: ConnectionState = { status: ConnectionStatus.Reconnecting };

// Offline only ends with the browser's own online event, so a late stream message can't hide it.
function unlessOffline(state: ConnectionState, status: ConnectionStatus): ConnectionState {
  return state.status === ConnectionStatus.Offline ? state : { status };
}

export const connectionFeature = createFeature({
  name: 'connection',
  reducer: createReducer(
    initialState,
    on(connectionActions.browserOffline, (): ConnectionState => ({
      status: ConnectionStatus.Offline
    })),
    on(connectionActions.browserOnline, (): ConnectionState => ({
      status: ConnectionStatus.Reconnecting
    })),
    on(connectionActions.requestNoResponse, realtimeActions.streamLost, (state): ConnectionState =>
      unlessOffline(state, ConnectionStatus.Reconnecting)
    ),
    on(realtimeActions.streamOpened, realtimeActions.eventReceived, (state): ConnectionState =>
      unlessOffline(state, ConnectionStatus.Live)
    )
  ),
  extraSelectors: ({ selectStatus }) => ({
    selectIsLive: createSelector(selectStatus, (status) => status === ConnectionStatus.Live)
  })
});
