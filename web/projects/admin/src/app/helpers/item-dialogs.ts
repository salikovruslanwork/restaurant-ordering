import type { ConfirmDialogData } from '@shared/ui';
import { ITEM_DELETE_TEXT } from '@admin/config/items.config';

export function itemDeleteDialog(name: string): ConfirmDialogData {
  return {
    title: `Delete “${name}”?`,
    text: ITEM_DELETE_TEXT,
    icon: 'delete',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep item',
    isDanger: true
  };
}
