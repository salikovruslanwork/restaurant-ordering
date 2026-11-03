import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConnectionStatus } from '@shared/data-access';

import { HEADER, HeaderComponent } from './header.component';

@Component({
  imports: [...HEADER],
  template: `<app-header name="Tea House" [connectionStatus]="status">
    <button appHeaderActions type="button">My orders</button>
  </app-header>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {
  readonly status = ConnectionStatus.Live;
}

describe('HeaderComponent', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('name', 'Tea House');
    fixture.componentRef.setInput('connectionStatus', ConnectionStatus.Offline);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element };
  }

  it('renders the name in a header landmark', async () => {
    const { element } = await render();

    expect(element.querySelector('header .header__name')?.textContent).toBe('Tea House');
    expect(element.querySelector('.header__tagline')).toBeNull();
    expect(element.querySelector('.header__role')).toBeNull();
  });

  it('renders the tagline and badge', async () => {
    const { element } = await render({ tagline: 'Made fresh', badge: 'Admin', slim: true });

    expect(element.querySelector('.header__tagline')?.textContent).toBe('Made fresh');
    expect(element.querySelector('.header__role')?.textContent).toBe('Admin');
    expect(element.querySelector('.header--slim')).not.toBeNull();
  });

  it('shows the connection status twice, for CSS to pick by screen size', async () => {
    const { element } = await render();

    expect(
      element.querySelector('.header__indicator .connection-indicator--offline')
    ).not.toBeNull();
    expect(
      element.querySelector('.header__compact-indicator .connection-indicator--compact')
    ).not.toBeNull();
  });

  it('has a static brand without a brand label', async () => {
    const { element } = await render();

    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('div.header__brand')).not.toBeNull();
  });

  it('has a clickable, labelled brand with a brand label', async () => {
    const { fixture, element } = await render({ brandLabel: 'Go to menu' });
    const clicked = vi.fn();
    fixture.componentInstance.brandClicked.subscribe(clicked);

    const brand = element.querySelector<HTMLButtonElement>('button.header__brand');
    brand?.click();

    expect(brand?.getAttribute('aria-label')).toBe('Go to menu');
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('projects the actions slot', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('header button')?.textContent).toBe('My orders');
  });
});
