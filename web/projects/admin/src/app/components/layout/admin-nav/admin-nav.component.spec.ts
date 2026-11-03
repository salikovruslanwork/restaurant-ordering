import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ADMIN_NAV_ITEMS } from '@admin/config/admin-nav.config';
import { AdminRoute } from '@admin/models/admin-nav.model';

import { AdminNavComponent } from './admin-nav.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class EmptyPageComponent {}

describe('AdminNavComponent', () => {
  async function render(url: string, badges = {}): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: AdminRoute.Categories, component: EmptyPageComponent },
          { path: 'elsewhere', component: EmptyPageComponent }
        ])
      ]
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(AdminNavComponent);
    fixture.componentRef.setInput('items', ADMIN_NAV_ITEMS);
    fixture.componentRef.setInput('badges', badges);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const link = (element: HTMLElement) =>
    element.querySelector<HTMLAnchorElement>('.admin-nav__item[href="/categories"]');

  it('renders one link per section inside a labelled nav', async () => {
    const element = await render('/categories');

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Admin sections');
    expect(element.querySelectorAll('.admin-nav__item')).toHaveLength(ADMIN_NAV_ITEMS.length);
    expect(
      [...element.querySelectorAll('.admin-nav__item')].map((item) => item.getAttribute('href'))
    ).toEqual(['/orders', '/items', '/categories']);
    expect(link(element)?.querySelector('.admin-nav__label')?.textContent).toBe('Categories');
    expect(link(element)?.querySelector('.icon')?.textContent).toBe('category');
  });

  it('marks the current section as active, with a filled icon', async () => {
    const element = await render('/categories');

    expect(link(element)?.classList).toContain('admin-nav__item--active');
    expect(link(element)?.getAttribute('aria-current')).toBe('page');
    expect(link(element)?.querySelector('.icon--filled')).not.toBeNull();
  });

  it('leaves other sections inactive', async () => {
    const element = await render('/elsewhere');

    expect(link(element)?.classList).not.toContain('admin-nav__item--active');
    expect(link(element)?.hasAttribute('aria-current')).toBe(false);
    expect(link(element)?.querySelector('.icon--filled')).toBeNull();
  });

  it('shows a badge with an accessible count, and none for zero', async () => {
    const element = await render('/categories', { [AdminRoute.Orders]: 3, [AdminRoute.Items]: 0 });
    const orders = element.querySelector('.admin-nav__item[href="/orders"]');
    const items = element.querySelector('.admin-nav__item[href="/items"]');

    expect(orders?.querySelector('.admin-nav__badge')?.textContent).toBe('3');
    expect(orders?.getAttribute('aria-label')).toBe('Orders, 3 new');
    expect(items?.querySelector('.admin-nav__badge')).toBeNull();
    expect(items?.hasAttribute('aria-label')).toBe(false);
  });
});
