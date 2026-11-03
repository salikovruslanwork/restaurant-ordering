export enum ConnectionBannerKind {
  Reconnecting = 'reconnecting',
  Offline = 'offline',
  Online = 'online'
}

export interface ConnectionHistory {
  hasBeenLive: boolean;
  wasDisconnected: boolean;
  isBackOnline: boolean;
}
