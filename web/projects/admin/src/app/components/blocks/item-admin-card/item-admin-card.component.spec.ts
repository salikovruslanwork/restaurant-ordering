import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { PricingKind } from '@restaurant/contracts';
import type { ItemRow } from '@admin/models/item-list.model';

import { ItemAdminCardComponent } from './item-admin-card.component';

const base: ItemRow = {
  id: 'miso',
  name: 'Miso',
  description: '',
  categoryName: 'Soups',
  pricing: { kind: PricingKind.Fixed, price: 450 },
  isAvailable: true,
  isSaving: false,
  isDeleting: false
};

describe('ItemAdminCardComponent', () => {
  let fixture: ComponentFixture<ItemAdminCardComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const meta = () =>
    element().querySelector('.item-admin-card__meta')?.textContent?.replace(/\s+/g, ' ').trim();

  async function render(row: Partial<ItemRow> = {}, readOnly = false): Promise<void> {
    fixture = TestBed.createComponent(ItemAdminCardComponent);
    fixture.componentRef.setInput('row', { ...base, ...row });
    fixture.componentRef.setInput('readOnly', readOnly);
    await fixture.whenStable();
  }

  it('shows the name, category and price', async () => {
    await render();

    expect(element().querySelector('.item-admin-card__name')?.textContent).toBe('Miso');
    expect(meta()).toBe('Soups · $4.50');
  });

  it('highlights a freshly changed card', async () => {
    await render();
    expect(element().querySelector('.item-admin-card--fresh')).toBeNull();

    fixture.componentRef.setInput('fresh', true);
    await fixture.whenStable();
    expect(element().querySelector('.item-admin-card--fresh')).not.toBeNull();
  });

  it('marks open price, unavailable and saving', async () => {
    await render({ pricing: { kind: PricingKind.Open }, isAvailable: false });
    expect(meta()).toBe('Soups · Open price · Unavailable');
    expect(element().querySelector('.dish-image--muted')).not.toBeNull();

    await render({ isSaving: true });
    expect(meta()).toBe('Soups · $4.50 · Saving…');
  });

  it('emits availability changes', async () => {
    await render();
    const changes: boolean[] = [];
    fixture.componentInstance.availabilityChanged.subscribe((value) => changes.push(value));

    element().querySelector<HTMLButtonElement>('[aria-label="Miso available"]')?.click();

    expect(changes).toEqual([false]);
  });

  it('turns the switch and the menu off while read-only', async () => {
    await render({}, true);

    expect(
      element().querySelector<HTMLButtonElement>('[aria-label="Miso available"]')?.disabled
    ).toBe(true);
    expect(
      element().querySelector<HTMLButtonElement>('[aria-label="More actions for Miso"]')?.disabled
    ).toBe(true);
  });
});
