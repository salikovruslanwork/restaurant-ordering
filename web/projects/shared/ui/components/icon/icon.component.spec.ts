import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  async function render(inputs: Record<string, unknown>): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(IconComponent);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('renders the ligature in the Material Symbols font set', async () => {
    const icon = (await render({ name: 'receipt' })).querySelector('.icon');

    expect(icon?.textContent?.trim()).toBe('receipt');
    expect(icon?.classList.contains('material-symbols-rounded')).toBe(true);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the size', async () => {
    const icon = (await render({ name: 'receipt', size: 16 })).querySelector<HTMLElement>('.icon');

    expect(icon?.style.getPropertyValue('--icon-size')).toBe('16px');
  });

  it('uses the default size from the mockup', async () => {
    const icon = (await render({ name: 'receipt' })).querySelector<HTMLElement>('.icon');

    expect(icon?.style.getPropertyValue('--icon-size')).toBe('22px');
  });

  it('can be filled', async () => {
    const element = await render({ name: 'receipt', filled: true });

    expect(element.querySelector('.icon--filled')).not.toBeNull();
    expect((await render({ name: 'receipt' })).querySelector('.icon--filled')).toBeNull();
  });
});
