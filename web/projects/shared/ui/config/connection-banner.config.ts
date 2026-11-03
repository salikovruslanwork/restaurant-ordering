import type { ConnectionHistory } from '../models/connection-banner.model';

export const BACK_ONLINE_DURATION_MS = 3000;
export const RECONNECTING_MESSAGE = 'Reconnecting…';
export const OFFLINE_MESSAGE = 'You’re offline — changes will appear when you’re back';
export const BACK_ONLINE_MESSAGE = 'Back online';

export const INITIAL_CONNECTION_HISTORY: ConnectionHistory = {
  hasBeenLive: false,
  wasDisconnected: false,
  isBackOnline: false
};
