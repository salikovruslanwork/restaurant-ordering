import { TestBed, type ComponentFixture } from '@angular/core/testing';

import type { Category } from '@restaurant/contracts';
import { AvailabilityFilter } from '@admin/models/menu-editor.model';

import { ItemsToolbarComponent } from './items-toolbar.component';

const categories: Category[] = [
  { id: 'soup', name: 'Soups', sortOrder: 0, version: 1 },
  { id: 'tea', name: 'Tea', sortOrder: 1, version: 1 }
];

describe('ItemsToolbarComponent', () => {
  let fixture: ComponentFixture<ItemsToolbarComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const addButton = () => element().querySelector<HTMLButtonElement>('.items-toolbar__add button');

  function chooseCategory(label: string): void {
    const select = element().querySelector('select');
    const option = [...(select?.options ?? [])].find((item) => item.textContent?.trim() === label);
    if (select && option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
    }
  }

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(ItemsToolbarComponent);
    fixture.componentRef.setInput('categories', categories);
    fixture.componentRef.setInput('filter', {
      categoryId: null,
      availability: AvailabilityFilter.All
    });
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
  }

  it('shows the category select, availability options and Add item', async () => {
    await render();

    expect(element().querySelector('.select__label')?.textContent).toBe('Category');
    expect(
      [...element().querySelectorAll('app-segmented-button button')].map((button) =>
        button.textContent?.replace('check', '').trim()
      )
    ).toEqual(['All', 'Available', 'Unavailable']);
    expect(addButton()?.textContent?.trim()).toContain('Add item');
  });

  it('emits filter changes and the add click', async () => {
    await render();
    const availability: AvailabilityFilter[] = [];
    const categoriesChosen: (string | null)[] = [];
    let added = 0;
    fixture.componentInstance.availabilityChanged.subscribe((value) => availability.push(value));
    fixture.componentInstance.categoryChanged.subscribe((value) => categoriesChosen.push(value));
    fixture.componentInstance.addClicked.subscribe(() => added++);

    [...element().querySelectorAll<HTMLButtonElement>('app-segmented-button button')]
      .find((button) => button.textContent?.includes('Unavailable'))
      ?.click();
    chooseCategory('Tea');
    await fixture.whenStable();
    chooseCategory('All categories');
    addButton()?.click();

    expect(availability).toEqual([AvailabilityFilter.Unavailable]);
    expect(categoriesChosen).toEqual(['tea', null]);
    expect(added).toBe(1);
  });

  it('disables Add item', async () => {
    await render({ addDisabled: true });
    expect(addButton()?.disabled).toBe(true);
  });
});
