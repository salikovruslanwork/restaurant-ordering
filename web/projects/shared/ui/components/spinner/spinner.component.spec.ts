import { TestBed } from '@angular/core/testing';

import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  it.each([
    [14, 2],
    [48, 6]
  ])('renders size %i with a stroke of %i', async (size, stroke) => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentRef.setInput('size', size);
    await fixture.whenStable();

    const spinner: HTMLElement = fixture.nativeElement.querySelector('.spinner');
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(spinner.style.width).toBe(`${size}px`);
    expect(spinner.querySelector('circle')?.style.strokeWidth).toContain(
      String((stroke / size) * 100).slice(0, 4)
    );
  });
});
