import { TestBed } from '@angular/core/testing';

import { DISH_IMAGE_TONES } from '../../config/dish-image.config';
import { DishImageSize } from '../../models/dish-image.model';
import { DishImageComponent } from './dish-image.component';

describe('DishImageComponent', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(DishImageComponent);
    fixture.componentRef.setInput('name', 'Oolong');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element };
  }

  it('shows a labelled placeholder without an image', async () => {
    const { element } = await render({});

    const placeholder = element.querySelector('[role="img"]');
    expect(placeholder?.getAttribute('aria-label')).toBe('Oolong');
    expect(element.querySelector('.dish-image__label')?.textContent).toBe('Oolong');
    expect(element.querySelector('img')).toBeNull();
  });

  it('can be muted', async () => {
    expect((await render({})).element.querySelector('.dish-image--muted')).toBeNull();
    expect(
      (await render({ muted: true })).element.querySelector('.dish-image--muted')
    ).not.toBeNull();
  });

  it.each([
    [{}, 44],
    [{ size: DishImageSize.Thumb }, 22],
    [{ size: DishImageSize.Compact }, 36]
  ])('sizes the placeholder icon for %o to %ipx', async (inputs, size) => {
    const icon = (await render(inputs)).element.querySelector<HTMLElement>(
      '.dish-image__icon .icon'
    );

    expect(icon?.style.getPropertyValue('--icon-size')).toBe(`${size}px`);
  });

  it('picks the same tone every time for the same name', async () => {
    const toneOf = async (name: string) => {
      const { element } = await render({ name });
      return DISH_IMAGE_TONES.find((tone) => element.querySelector(`.dish-image--${tone}`));
    };

    expect(await toneOf('Oolong')).toBeDefined();
    expect(await toneOf('Oolong')).toBe(await toneOf('Oolong'));
  });

  it('uses more than one tone across names', async () => {
    const tones = await Promise.all(
      ['a', 'b', 'c', 'd'].map(async (name) => {
        const { element } = await render({ name });
        return DISH_IMAGE_TONES.find((tone) => element.querySelector(`.dish-image--${tone}`));
      })
    );

    expect(new Set(tones).size).toBe(4);
  });

  it.each(Object.values(DishImageSize))('applies the %s size', async (size) => {
    expect((await render({ size })).element.querySelector(`.dish-image--${size}`)).not.toBeNull();
  });
});
