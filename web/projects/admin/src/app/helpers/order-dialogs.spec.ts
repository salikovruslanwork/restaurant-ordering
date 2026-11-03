import { orderCancelDialog } from './order-dialogs';

describe('orderCancelDialog', () => {
  it('asks before cancelling, as a dangerous action', () => {
    expect(orderCancelDialog(1042)).toEqual({
      title: 'Cancel order #1042?',
      text: 'The customer will see that the order was cancelled. This can’t be undone.',
      icon: 'cancel',
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      isDanger: true
    });
  });
});
