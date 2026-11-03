export enum ConnectionStatus {
  Live = 'live',
  Reconnecting = 'reconnecting',
  Offline = 'offline'
}

export interface ConnectionState {
  status: ConnectionStatus;
}
