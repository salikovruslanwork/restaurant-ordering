import { TestBed } from '@angular/core/testing';

import { DIALOG_DATA } from '../../config/overlay.config';
import type { ConfirmDialogData } from '../../models/confirm-dialog.model';
import { DialogRef } from '../../services/dialog-ref';
import { ConfirmDialogComponent } from './confirm-dialog.component';

const base: ConfirmDialogData = {
  title: 'Cancel order #1042?',
  text: 'The customer will see it as cancelled.',
  icon: 'cancel',
  confirmLabel: 'Cancel order',
  cancelLabel: 'Keep order'
};

describe('ConfirmDialogComponent', () => {
  let close: ReturnType<typeof vi.fn>;

  async function render(data: ConfirmDialogData): Promise<HTMLElement> {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } }
      ]
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const buttons = (element: HTMLElement) => [
    ...element.querySelectorAll('.dialog__actions button')
  ];

  it('renders the title, text and icon in a small dialog', async () => {
    const element = await render(base);

    expect(element.querySelector('.dialog--small')).not.toBeNull();
    expect(element.querySelector('.dialog__title')?.textContent).toContain(base.title);
    expect(element.querySelector('.confirm-dialog__text')?.textContent).toBe(base.text);
    expect(element.querySelector('.dialog__hero')?.textContent?.trim()).toBe('cancel');
  });

  it('puts the actions in order: cancel, then confirm', async () => {
    const element = await render(base);

    expect(buttons(element).map((button) => button.textContent?.trim())).toEqual([
      'Keep order',
      'Cancel order'
    ]);
  });

  it.each([
    [0, false],
    [1, true]
  ])('button %i answers %s', async (index, answer) => {
    const element = await render(base);

    buttons(element)[index]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(close).toHaveBeenCalledExactlyOnceWith(answer);
  });

  it.each([
    ['warning', {}, 'filled'],
    ['error', { isDanger: true }, 'danger'],
    ['error', { cancelLabel: undefined }, 'filled']
  ])('uses the %s tone for %j', async (tone, overrides, variant) => {
    const element = await render({ ...base, ...overrides });

    expect(element.querySelector(`.dialog__hero--${tone}`)).not.toBeNull();
    expect(buttons(element).at(-1)?.classList.contains(`button--${variant}`)).toBe(true);
  });

  it('shows only the confirm button without a cancel label', async () => {
    expect(buttons(await render({ ...base, cancelLabel: undefined }))).toHaveLength(1);
  });
});
