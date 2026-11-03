import { TestBed } from '@angular/core/testing';

import { SkeletonVariant } from '../../models/skeleton.model';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  it.each(Object.values(SkeletonVariant))(
    'renders the %s variant, hidden from readers',
    async (variant) => {
      const fixture = TestBed.createComponent(SkeletonComponent);
      fixture.componentRef.setInput('variant', variant);
      await fixture.whenStable();

      const skeleton: HTMLElement = fixture.nativeElement.querySelector(`.skeleton--${variant}`);
      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    }
  );

  it('defaults to a text line', async () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.skeleton--line')).not.toBeNull();
  });
});
