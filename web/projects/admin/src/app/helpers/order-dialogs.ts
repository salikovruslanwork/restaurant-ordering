import type { ConfirmDialogData } from '@shared/ui';
import { ORDER_CANCEL_TEXT } from '@admin/config/orders.config';

export function orderCancelDialog(number: number): ConfirmDialogData {
  return {
    title: `Cancel order #${number}?`,
    text: ORDER_CANCEL_TEXT,
    icon: 'cancel',
    confirmLabel: 'Cancel order',
    cancelLabel: 'Keep order',
    isDanger: true
  };
}
