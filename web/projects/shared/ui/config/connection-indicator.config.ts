import { ConnectionStatus } from '@shared/data-access';

export const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  [ConnectionStatus.Live]: 'Live',
  [ConnectionStatus.Reconnecting]: 'Reconnecting',
  [ConnectionStatus.Offline]: 'Offline'
};
