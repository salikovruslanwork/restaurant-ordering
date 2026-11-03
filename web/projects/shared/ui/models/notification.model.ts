export enum NotificationKind {
  Info = 'info',
  Error = 'error'
}

export interface NotificationOptions {
  action?: string;
  kind?: NotificationKind;
}
