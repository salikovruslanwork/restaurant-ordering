import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ButtonSize, ButtonVariant } from '../../models/button.model';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  async function render(inputs: Record<string, unknown> = {}): Promise<HTMLButtonElement> {
    const fixture = TestBed.createComponent(ButtonComponent);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('button');
  }

  it.each(Object.values(ButtonVariant))(
    'renders the %s variant with its BEM modifier',
    async (variant) => {
      const button = await render({ variant });

      expect(button.classList.contains('button')).toBe(true);
      expect(button.classList.contains(`button--${variant}`)).toBe(true);
    }
  );

  it.each([
    [ButtonVariant.Filled, 'mat-mdc-unelevated-button'],
    [ButtonVariant.Danger, 'mat-mdc-unelevated-button'],
    [ButtonVariant.Outlined, 'mat-mdc-outlined-button'],
    [ButtonVariant.OutlinedDanger, 'mat-mdc-outlined-button'],
    [ButtonVariant.Text, 'mat-mdc-button'],
    [ButtonVariant.TextDanger, 'mat-mdc-button'],
    [ButtonVariant.Tonal, 'mat-tonal-button'],
    [ButtonVariant.Icon, 'mat-mdc-icon-button'],
    [ButtonVariant.Fab, 'mat-mdc-fab']
  ])('uses the matching Material button for %s', async (variant, materialClass) => {
    expect((await render({ variant })).classList.contains(materialClass)).toBe(true);
  });

  it('defaults to a filled, medium, non-submitting button', async () => {
    const button = await render();

    expect(button.classList.contains('button--filled')).toBe(true);
    expect(button.classList.contains('button--medium')).toBe(true);
    expect(button.type).toBe('button');
  });

  it('passes type and aria-label to the native button', async () => {
    const button = await render({ type: 'submit', ariaLabel: 'Save' });

    expect(button.type).toBe('submit');
    expect(button.getAttribute('aria-label')).toBe('Save');
  });

  it('reports whether the content it toggles is expanded', async () => {
    expect((await render({ ariaExpanded: true })).getAttribute('aria-expanded')).toBe('true');
    expect((await render({ ariaExpanded: false })).getAttribute('aria-expanded')).toBe('false');
    expect((await render()).hasAttribute('aria-expanded')).toBe(false);
  });

  it('renders a router link styled as the button', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('link', '/orders');
    fixture.componentRef.setInput('variant', ButtonVariant.Tonal);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/orders');
    expect(element.querySelector('a')?.classList).toContain('button--tonal');
  });

  it('applies size and block modifiers', async () => {
    expect((await render({ size: ButtonSize.Small })).classList.contains('button--small')).toBe(
      true
    );
    expect((await render({ block: true })).classList.contains('button--block')).toBe(true);
  });

  it('renders an icon', async () => {
    expect((await render({ icon: 'add' })).querySelector('app-icon')?.textContent?.trim()).toBe(
      'add'
    );
  });

  it.each([
    [ButtonVariant.Filled, '18px'],
    [ButtonVariant.Icon, '22px'],
    [ButtonVariant.Fab, '26px']
  ])('sizes the icon of %s', async (variant, size) => {
    const icon = (await render({ variant, icon: 'add' })).querySelector<HTMLElement>('.icon');

    expect(icon?.style.getPropertyValue('--icon-size')).toBe(size);
  });

  it('uses a smaller icon on a small icon button', async () => {
    const icon = (
      await render({
        variant: ButtonVariant.Icon,
        size: ButtonSize.Small,
        icon: 'add'
      })
    ).querySelector<HTMLElement>('.icon');

    expect(icon?.style.getPropertyValue('--icon-size')).toBe('18px');
  });

  it('disables the native button', async () => {
    expect((await render({ disabled: true })).disabled).toBe(true);
  });

  it('shows a spinner instead of the icon and blocks clicks while loading', async () => {
    const button = await render({ loading: true, icon: 'add' });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.classList.contains('button--busy')).toBe(true);
    expect(button.querySelector('app-spinner')).not.toBeNull();
    expect(button.querySelector('app-icon')).toBeNull();
  });

  it.each([ButtonVariant.Filled, ButtonVariant.Icon, ButtonVariant.Fab])(
    'disables %s while loading',
    async (variant) => {
      expect((await render({ variant, loading: true })).disabled).toBe(true);
    }
  );
});
