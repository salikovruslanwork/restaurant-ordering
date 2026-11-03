import {
  categoryBlockedDialog,
  categoryDeleteDialog,
  categoryNotEmptyMessage
} from './category-dialogs';

describe('category dialogs', () => {
  it('explains why a category with items can’t be deleted', () => {
    expect(categoryNotEmptyMessage('Soups', 1)).toBe(
      "Can't delete 'Soups' — it still has 1 item. Move or delete them first."
    );
    expect(categoryNotEmptyMessage('Soups', 12)).toContain('12 items');
  });

  it('builds a blocked dialog with one button', () => {
    const data = categoryBlockedDialog('Not possible');

    expect(data).toMatchObject({ text: 'Not possible', confirmLabel: 'OK', icon: 'block' });
    expect(data.cancelLabel).toBeUndefined();
  });

  it('builds a dangerous delete confirmation', () => {
    expect(categoryDeleteDialog('Soups')).toMatchObject({
      title: 'Delete “Soups”?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep category',
      isDanger: true
    });
  });
});
