import { TestBed } from '@angular/core/testing';

import { SegmentedButtonComponent } from './segmented-button.component';

describe('SegmentedButtonComponent', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'off', label: 'Unavailable' }
  ];

  async function render(value = 'all') {
    const fixture = TestBed.createComponent(SegmentedButtonComponent<string>);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('ariaLabel', 'Availability');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, buttons: [...element.querySelectorAll('button')] };
  }

  it('renders the options inside a labelled group', async () => {
    const { element, buttons } = await render();

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'checkAll',
      'Unavailable'
    ]);
    const group = element.querySelector('.segmented-button');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Availability');
  });

  it('marks the current value', async () => {
    const { buttons } = await render('off');

    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(buttons[1]?.querySelector('app-icon')?.textContent?.trim()).toBe('check');
  });

  it('emits the chosen value', async () => {
    const { fixture, buttons } = await render();
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);

    buttons[1]?.click();

    expect(changed).toHaveBeenCalledExactlyOnceWith('off');
  });

  it('ignores a click on the current value', async () => {
    const { fixture, buttons } = await render();
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);

    buttons[0]?.click();

    expect(changed).not.toHaveBeenCalled();
  });
});
