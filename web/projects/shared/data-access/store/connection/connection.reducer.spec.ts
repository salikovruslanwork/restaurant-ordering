import { ServerEventType } from '@restaurant/contracts';

import { ConnectionStatus } from '../../models/connection.model';
import { realtimeActions } from '../realtime/realtime.actions';
import { connectionActions } from './connection.actions';
import { connectionFeature } from './connection.reducer';

const { reducer, selectIsLive } = connectionFeature;
const { Live, Reconnecting, Offline } = ConnectionStatus;

const eventReceived = realtimeActions.eventReceived({
  envelope: { seq: 1, at: '', event: { type: ServerEventType.Resync } }
});

describe('connection reducer', () => {
  it('starts as reconnecting', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({ status: Reconnecting });
  });

  it.each([
    ['the stream opening', Reconnecting, realtimeActions.streamOpened(), Live],
    ['an event', Reconnecting, eventReceived, Live],
    ['a lost stream', Live, realtimeActions.streamLost(), Reconnecting],
    ['a request with no response', Live, connectionActions.requestNoResponse(), Reconnecting],
    ['the browser going offline', Live, connectionActions.browserOffline(), Offline],
    ['offline while reconnecting', Reconnecting, connectionActions.browserOffline(), Offline],
    ['the browser coming back', Offline, connectionActions.browserOnline(), Reconnecting]
  ])('handles %s', (_name, status, action, expected) => {
    expect(reducer({ status }, action)).toEqual({ status: expected });
  });

  it.each([
    ['a late stream open', realtimeActions.streamOpened()],
    ['a late event', eventReceived],
    ['a stream error', realtimeActions.streamLost()],
    ['a failed request', connectionActions.requestNoResponse()]
  ])('stays offline after %s', (_name, action) => {
    expect(reducer({ status: Offline }, action)).toEqual({ status: Offline });
  });

  it('selects whether the connection is live', () => {
    expect(selectIsLive.projector(Live)).toBe(true);
    expect(selectIsLive.projector(Reconnecting)).toBe(false);
    expect(selectIsLive.projector(Offline)).toBe(false);
  });
});
