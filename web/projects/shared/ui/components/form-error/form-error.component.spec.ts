import { TestBed } from '@angular/core/testing';

import { FormErrorComponent } from './form-error.component';

describe('FormErrorComponent', () => {
  it('announces the message', async () => {
    const fixture = TestBed.createComponent(FormErrorComponent);
    fixture.componentRef.setInput('message', 'Couldn’t save.');
    await fixture.whenStable();

    const error: HTMLElement = fixture.nativeElement.querySelector('.form-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Couldn’t save.');
  });
});
