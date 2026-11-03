import { OrderStatus } from '@restaurant/contracts';

export const STATUS_CHIP: Record<OrderStatus, { label: string; icon: string }> = {
  [OrderStatus.Placed]: { label: 'Placed', icon: 'receipt' },
  [OrderStatus.Preparing]: { label: 'Preparing', icon: 'skillet' },
  [OrderStatus.Ready]: { label: 'Ready', icon: 'room_service' },
  [OrderStatus.Cancelled]: { label: 'Cancelled', icon: 'cancel' }
};
