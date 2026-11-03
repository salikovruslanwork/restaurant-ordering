import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { SelectComponent } from './select.component';

@Component({
  imports: [ReactiveFormsModule, SelectComponent],
  template: `<app-select
    label="Category"
    placeholder="Pick one"
    compact
    [errorMessages]="messages"
    [formControl]="control()"
    [options]="options"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly options = [
    { value: 'tea', label: 'Tea' },
    { value: 'soup', label: 'Soups' }
  ];
  readonly messages = { required: 'Choose a category' };
}

describe('SelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let control: FormControl<string | null>;

  const element = (): HTMLElement => fixture.nativeElement;
  const select = (): HTMLSelectElement | null => element().querySelector('select');
  const shownLabel = () => select()?.selectedOptions[0]?.textContent?.trim() ?? '';

  async function render(initial: string | null = 'tea'): Promise<void> {
    control = new FormControl(initial, { validators: Validators.required });
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();
  }

  async function choose(index: number): Promise<void> {
    const native = select();
    if (native) {
      native.value = String(index);
      native.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
  }

  it('labels the native select', async () => {
    await render();

    const label = element().querySelector('label.select__label');
    expect(label?.textContent).toBe('Category');
    expect(label?.getAttribute('for')).toBe(select()?.id);
    expect(element().querySelector('.select--compact')).not.toBeNull();
  });

  it('shows the label of the control value', async () => {
    await render('soup');

    expect(shownLabel()).toBe('Soups');
  });

  it('follows later control values', async () => {
    await render('tea');

    control.setValue('soup');
    await fixture.whenStable();

    expect(shownLabel()).toBe('Soups');
  });

  it('lists the options and sends the chosen value to the control', async () => {
    await render();

    expect([...(select()?.options ?? [])].map((option) => option.textContent?.trim())).toEqual([
      'Tea',
      'Soups'
    ]);

    await choose(1);

    expect(control.value).toBe('soup');
    expect(shownLabel()).toBe('Soups');
  });

  it('shows the placeholder while the value matches no option', async () => {
    await render(null);

    expect(select()?.selectedOptions[0]?.value).toBe('');
    expect(shownLabel()).toBe('Pick one');
    expect(select()?.options).toHaveLength(3);
  });

  it('marks the control as touched on blur', async () => {
    await render();
    expect(control.touched).toBe(false);

    select()?.dispatchEvent(new Event('blur'));

    expect(control.touched).toBe(true);
  });

  it('follows the disabled state', async () => {
    await render();

    control.disable();
    await fixture.whenStable();

    expect(select()?.disabled).toBe(true);
  });

  it('marks the select invalid when it is already invalid at first render', async () => {
    control = new FormControl<string | null>(null, { validators: Validators.required });
    control.markAsTouched();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();

    expect(select()?.getAttribute('aria-invalid')).toBe('true');
    expect(element().querySelector('.select--error')).not.toBeNull();
  });

  it('shows an error once touched', async () => {
    await render(null);
    expect(element().querySelector('.select__error')).toBeNull();

    control.markAsTouched();
    await fixture.whenStable();

    const error = element().querySelector('.select__error');
    expect(error?.textContent).toContain('Choose a category');
    expect(element().querySelector('.select--error')).not.toBeNull();
    expect(select()?.getAttribute('aria-invalid')).toBe('true');
    expect(select()?.getAttribute('aria-describedby')).toBe(error?.id);
  });
});
