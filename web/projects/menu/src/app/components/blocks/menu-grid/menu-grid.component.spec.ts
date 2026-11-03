import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { getGridLayout } from '@menu/helpers/menu-grid';
import { makeItem } from '@menu/testing/menu';

import { MenuGridComponent } from './menu-grid.component';

describe('MenuGridComponent', () => {
  let fixture: ComponentFixture<MenuGridComponent>;
  const element = (): HTMLElement => fixture.nativeElement;

  async function render(mobile = false): Promise<void> {
    fixture = TestBed.createComponent(MenuGridComponent);
    fixture.componentRef.setInput('items', [
      makeItem({ id: 'a', name: 'A' }),
      makeItem({ id: 'b', name: 'B' })
    ]);
    fixture.componentRef.setInput('mobile', mobile);
    await fixture.whenStable();
  }

  it('lists the dishes in rows of fixed height, ', async () => {
    await render();

    expect(element().querySelector('[role="list"]')?.getAttribute('aria-label')).toBe('Dishes');
    expect(
      [...element().querySelectorAll('app-menu-item h2')].map((name) => name.textContent)
    ).toEqual(['A', 'B']);
    const row = element().querySelector<HTMLElement>('.menu-grid__row');
    expect(row?.style.height).toBe(`${getGridLayout(0, false).rowHeight}px`);
    expect(row?.style.getPropertyValue('--menu-grid-columns')).toBe('1');
  });

  it('hides the desktop grid until its width is measured, but not the mobile one', async () => {
    await render();
    expect(element().querySelector('.menu-grid--measuring')).not.toBeNull();

    await render(true);
    expect(element().querySelector('.menu-grid--measuring')).toBeNull();
  });

  it('uses rows of fixed height on mobile', async () => {
    await render(true);

    expect(element().querySelector<HTMLElement>('.menu-grid__row')?.style.height).toBe('160px');
  });

  it('passes quantities in and cart events out with the dish', async () => {
    await render();
    fixture.componentRef.setInput('quantities', { a: 3 });
    await fixture.whenStable();
    const events: string[] = [];
    fixture.componentInstance.added.subscribe((item) => events.push(`added ${item.id}`));
    fixture.componentInstance.quantityChanged.subscribe(({ item, quantity }) =>
      events.push(`${item.id} ${quantity}`)
    );

    element().querySelector<HTMLButtonElement>('button[aria-label="Increase A"]')?.click();
    element().querySelector<HTMLButtonElement>('button[aria-label="Add B"]')?.click();

    expect(events).toEqual(['a 4', 'added b']);
  });
});
