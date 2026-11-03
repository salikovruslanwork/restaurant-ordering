import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { ActionMenuComponent } from './action-menu.component';

describe('ActionMenuComponent', () => {
  const items = [
    { label: 'Edit', icon: 'edit' },
    { label: 'Delete', icon: 'delete', isDanger: true },
    { label: 'Plain' }
  ];

  async function render(disabled = false) {
    const fixture = TestBed.createComponent(ActionMenuComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('ariaLabel', 'More for Oolong');
    fixture.componentRef.setInput('disabled', disabled);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    return { fixture, trigger };
  }

  async function openItems(
    fixture: ComponentFixture<ActionMenuComponent>,
    trigger: HTMLButtonElement
  ) {
    trigger.click();
    await fixture.whenStable();
    return [...document.querySelectorAll<HTMLElement>('.action-menu__item')];
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('labels the trigger', async () => {
    expect((await render()).trigger.getAttribute('aria-label')).toBe('More for Oolong');
  });

  it('can be disabled', async () => {
    expect((await render(true)).trigger.disabled).toBe(true);
  });

  it('opens the items, with their icons and danger modifier', async () => {
    const { fixture, trigger } = await render();

    const rendered = await openItems(fixture, trigger);

    expect(
      rendered.map((item) =>
        item.querySelector('.action-menu__content')?.textContent?.trim().replace(/\s+/g, ' ')
      )
    ).toEqual(['edit Edit', 'delete Delete', 'Plain']);
    expect(rendered.map((item) => item.classList.contains('action-menu__item--danger'))).toEqual([
      false,
      true,
      false
    ]);
    expect(rendered[2]?.querySelector('app-icon')).toBeNull();
  });

  it('emits the chosen item', async () => {
    const { fixture, trigger } = await render();
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);

    (await openItems(fixture, trigger))[1]?.click();

    expect(selected).toHaveBeenCalledExactlyOnceWith(items[1]);
  });
});
