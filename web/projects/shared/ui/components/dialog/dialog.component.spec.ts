import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DIALOG_TITLE_ID } from '../../config/overlay.config';
import { DialogSize, DialogTone } from '../../models/dialog.model';
import { DIALOG } from './dialog.component';

@Component({
  imports: [...DIALOG],
  template: `<app-dialog
    [closeDisabled]="closeDisabled()"
    [heroTone]="tone()"
    [size]="size()"
    (closeRequested)="closes = closes + 1"
  >
    <span appDialogIcon>icon</span>
    <span appDialogTitle>Title</span>
    <p appDialogContent>Content</p>
    <span appDialogActions>Actions</span>
  </app-dialog>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {
  readonly tone = signal<DialogTone | null>(null);
  readonly size = signal(DialogSize.Form);
  readonly closeDisabled = signal(false);
  closes = 0;
}

describe('DialogComponent', () => {
  async function render(titleId?: string) {
    if (titleId) {
      TestBed.configureTestingModule({
        providers: [{ provide: DIALOG_TITLE_ID, useValue: titleId }]
      });
    }
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element };
  }

  it('projects each slot into its region', async () => {
    const { element } = await render();

    expect(element.querySelector('.dialog__title')?.textContent).toContain('Title');
    expect(element.querySelector('.dialog__content')?.textContent).toContain('Content');
    expect(element.querySelector('.dialog__actions')?.textContent).toContain('Actions');
  });

  it('shows no hero without a tone', async () => {
    const { element } = await render();

    expect(element.querySelector('.dialog__hero')).toBeNull();
    expect(element.querySelector('.dialog--hero')).toBeNull();
  });

  it.each(Object.values(DialogTone))('shows the hero with the %s tone', async (tone) => {
    const { fixture, element } = await render();

    fixture.componentInstance.tone.set(tone);
    await fixture.whenStable();

    expect(element.querySelector(`.dialog__hero--${tone}`)?.textContent).toContain('icon');
    expect(element.querySelector('.dialog--hero')).not.toBeNull();
  });

  it.each(Object.values(DialogSize))('applies the %s size', async (size) => {
    const { fixture, element } = await render();

    fixture.componentInstance.size.set(size);
    await fixture.whenStable();

    expect(element.querySelector(`.dialog--${size}`)).not.toBeNull();
  });

  it('takes the title id the dialog service labels the dialog with', async () => {
    expect((await render('title-1')).element.querySelector('.dialog__title')?.id).toBe('title-1');
  });

  it('asks to close through the close button', async () => {
    const { fixture, element } = await render();

    element.querySelector<HTMLButtonElement>('.dialog__close button')?.click();

    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('can block closing while saving', async () => {
    const { fixture, element } = await render();

    fixture.componentInstance.closeDisabled.set(true);
    await fixture.whenStable();

    expect(element.querySelector<HTMLButtonElement>('.dialog__close button')?.disabled).toBe(true);
  });
});
