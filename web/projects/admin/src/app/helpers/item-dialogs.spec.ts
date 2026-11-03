import { itemDeleteDialog } from './item-dialogs';

describe('itemDeleteDialog', () => {
  it('builds a dangerous delete confirmation', () => {
    expect(itemDeleteDialog('Miso')).toEqual({
      title: 'Delete “Miso”?',
      text: 'It will disappear from the menu right away. Orders that were already placed keep it.',
      icon: 'delete',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep item',
      isDanger: true
    });
  });
});
