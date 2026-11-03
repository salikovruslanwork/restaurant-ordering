import { TestBed } from '@angular/core/testing';

import { ERROR_STATE_RETRY_LABEL, ERROR_STATE_TITLE } from '../../config/error-state.config';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.componentRef.setInput('text', 'We couldn’t load the menu.');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element };
  }

  it('announces the problem with the default heading and retry label', async () => {
    const { element } = await render();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('.error-state__title')?.textContent).toBe(ERROR_STATE_TITLE);
    expect(element.querySelector('.error-state__text')?.textContent).toBe(
      'We couldn’t load the menu.'
    );
    expect(element.querySelector('button')?.textContent).toContain(ERROR_STATE_RETRY_LABEL);
  });

  it('accepts its own heading and label', async () => {
    const { element } = await render({ heading: 'Oops', retryLabel: 'Again' });

    expect(element.querySelector('.error-state__title')?.textContent).toBe('Oops');
    expect(element.querySelector('button')?.textContent).toContain('Again');
  });

  it('emits retry', async () => {
    const { fixture, element } = await render();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    element.querySelector('button')?.click();

    expect(retry).toHaveBeenCalledOnce();
  });
});
