import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { CATEGORY_SKELETON_CHIPS } from '@menu/config/menu.config';
import { makeCategory } from '@menu/testing/menu';

import { CategoryBarComponent } from './category-bar.component';

describe('CategoryBarComponent', () => {
  let fixture: ComponentFixture<CategoryBarComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const chips = () => [...element().querySelectorAll<HTMLButtonElement>('.category-bar__chip')];

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(CategoryBarComponent);
    fixture.componentRef.setInput('categories', [
      makeCategory('soup', 'Soups', 0),
      makeCategory('tea', 'Tea', 1)
    ]);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
  }

  it('offers All and every category, with All current by default', async () => {
    await render();

    expect(element().querySelector('nav')?.getAttribute('aria-label')).toBe('Menu categories');
    expect(chips().map((chip) => chip.textContent?.trim())).toEqual(['All', 'Soups', 'Tea']);
    expect(chips().map((chip) => chip.getAttribute('aria-current'))).toEqual(['true', null, null]);
  });

  it('marks the selected category', async () => {
    await render({ selectedId: 'tea' });

    expect(chips()[2]?.classList).toContain('category-bar__chip--active');
    expect(chips()[2]?.getAttribute('aria-current')).toBe('true');
    expect(chips()[0]?.hasAttribute('aria-current')).toBe(false);
  });

  it('emits the chosen category, or null for All', async () => {
    await render({ selectedId: 'tea' });
    const chosen: (string | null)[] = [];
    fixture.componentInstance.selected.subscribe((id) => chosen.push(id));

    chips()[1]?.click();
    chips()[0]?.click();

    expect(chosen).toEqual(['soup', null]);
  });

  it('shows skeleton chips while loading', async () => {
    await render({ loading: true });

    expect(element().querySelector('nav')).toBeNull();
    expect(element().querySelectorAll('app-skeleton')).toHaveLength(CATEGORY_SKELETON_CHIPS);
  });
});
