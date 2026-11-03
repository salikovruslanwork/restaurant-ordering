import { TestBed } from '@angular/core/testing';

import { SwitchComponent } from './switch.component';

describe('SwitchComponent', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(SwitchComponent);
    fixture.componentRef.setInput('ariaLabel', 'Available');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    return { fixture, button };
  }

  it('passes the label and state to the native switch', async () => {
    const { button } = await render({ checked: true });

    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-label')).toBe('Available');
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('is off by default', async () => {
    expect((await render()).button.getAttribute('aria-checked')).toBe('false');
  });

  it('emits the new value', async () => {
    const { fixture, button } = await render();
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);

    button.click();

    expect(changed).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('does nothing while disabled', async () => {
    const { fixture, button } = await render({ disabled: true });
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);

    button.click();

    expect(button.disabled).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });
});
