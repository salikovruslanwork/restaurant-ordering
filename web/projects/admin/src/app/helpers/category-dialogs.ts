import type { ConfirmDialogData } from '@shared/ui';
import { pluralize } from '@shared/util';
import { CATEGORY_BLOCKED_TITLE, CATEGORY_DELETE_TEXT } from '@admin/config/categories.config';

export function categoryNotEmptyMessage(name: string, itemCount: number): string {
  return `Can't delete '${name}' — it still has ${pluralize(itemCount, 'item')}. Move or delete them first.`;
}

export function categoryBlockedDialog(text: string): ConfirmDialogData {
  return { title: CATEGORY_BLOCKED_TITLE, text, icon: 'block', confirmLabel: 'OK' };
}

export function categoryDeleteDialog(name: string): ConfirmDialogData {
  return {
    title: `Delete “${name}”?`,
    text: CATEGORY_DELETE_TEXT,
    icon: 'delete',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep category',
    isDanger: true
  };
}
