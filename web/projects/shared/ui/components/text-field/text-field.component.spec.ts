import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TextFieldType } from '../../models/text-field.model';
import { TextFieldComponent } from './text-field.component';

@Component({
  imports: [ReactiveFormsModule, TextFieldComponent],
  template: `<app-text-field
    label="Name"
    [compact]="compact()"
    [errorMessages]="messages"
    [formControl]="control()"
    [hint]="hint()"
    [labelHidden]="labelHidden()"
    [large]="large()"
    [placeholder]="placeholder()"
    [type]="type()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class HostComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly type = signal(TextFieldType.Text);
  readonly hint = signal<string | null>(null);
  readonly large = signal(false);
  readonly compact = signal(false);
  readonly labelHidden = signal(false);
  readonly placeholder = signal('');
  readonly messages = { required: 'Enter a name' };
}

describe('TextFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let control: FormControl<string | null>;

  const element = (): HTMLElement => fixture.nativeElement;
  const field = (): HTMLInputElement | null => element().querySelector('input');
  const area = (): HTMLTextAreaElement | null => element().querySelector('textarea');

  async function render(initial = 'Oolong'): Promise<void> {
    control = new FormControl<string | null>(initial, { validators: Validators.required });
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();
  }

  it('links the label to the input', async () => {
    await render();

    const label = element().querySelector('label');
    expect(label?.textContent).toBe('Name');
    expect(label?.htmlFor).toBe(field()?.id);
  });

  it('can hide the label visually and keep it for screen readers', async () => {
    await render();
    const label = (): HTMLLabelElement | null => element().querySelector('label');
    expect(label()?.classList).not.toContain('text-field__label--hidden');

    fixture.componentInstance.labelHidden.set(true);
    await fixture.whenStable();

    expect(label()?.classList).toContain('text-field__label--hidden');
    expect(label()?.htmlFor).toBe(field()?.id);
  });

  it('gives every field its own id', async () => {
    await render();
    const first = field()?.id;

    await render();

    expect(field()?.id).not.toBe(first);
  });

  describe('ControlValueAccessor', () => {
    it('shows the control value', async () => {
      await render('Oolong');

      expect(field()?.value).toBe('Oolong');
    });

    it('shows a later control value, and null as empty', async () => {
      await render();

      control.setValue('Sencha');
      await fixture.whenStable();
      expect(field()?.value).toBe('Sencha');

      control.setValue(null);
      await fixture.whenStable();
      expect(field()?.value).toBe('');
    });

    it('sends typed text to the control', async () => {
      await render();
      const input = field();
      if (!input) throw new Error('No input');

      input.value = 'Miso';
      input.dispatchEvent(new Event('input'));

      expect(control.value).toBe('Miso');
      expect(control.dirty).toBe(true);
    });

    it('marks the control as touched on blur', async () => {
      await render();
      expect(control.touched).toBe(false);

      field()?.dispatchEvent(new Event('blur'));

      expect(control.touched).toBe(true);
    });

    it('follows the disabled state', async () => {
      await render();

      control.disable();
      await fixture.whenStable();
      expect(field()?.disabled).toBe(true);

      control.enable();
      await fixture.whenStable();
      expect(field()?.disabled).toBe(false);
    });
  });

  describe('types', () => {
    it('renders text without a prefix', async () => {
      await render();

      expect(element().querySelector('.text-field__prefix')).toBeNull();
      expect(field()?.getAttribute('inputmode')).toBeNull();
    });

    it('renders money with a $ prefix and a decimal keyboard, and keeps the text as typed', async () => {
      await render('12.50');
      fixture.componentInstance.type.set(TextFieldType.Money);
      await fixture.whenStable();

      expect(element().querySelector('.text-field__prefix')?.textContent).toBe('$');
      expect(field()?.getAttribute('inputmode')).toBe('decimal');
      expect(field()?.value).toBe('12.50');
      expect(control.value).toBe('12.50');
    });

    it('renders a textarea with the same bindings', async () => {
      await render('Roasted');
      fixture.componentInstance.type.set(TextFieldType.Textarea);
      await fixture.whenStable();
      const textarea = area();
      if (!textarea) throw new Error('No textarea');

      expect(field()).toBeNull();
      expect(textarea.value).toBe('Roasted');

      textarea.value = 'Grassy';
      textarea.dispatchEvent(new Event('input'));
      textarea.dispatchEvent(new Event('blur'));

      expect(control.value).toBe('Grassy');
      expect(control.touched).toBe(true);
    });
  });

  describe('messages', () => {
    it('shows the hint and links it to the input', async () => {
      await render();
      fixture.componentInstance.hint.set('Shown on the menu');
      await fixture.whenStable();

      const help = element().querySelector('.text-field__help');
      expect(help?.textContent).toBe('Shown on the menu');
      expect(field()?.getAttribute('aria-describedby')).toContain(help?.id);
    });

    it('hides an error until the control is touched', async () => {
      await render('');

      expect(element().querySelector('.text-field__error')).toBeNull();
      expect(element().querySelector('.text-field--error')).toBeNull();
    });

    it('keeps the message slot with or without an error', async () => {
      await render('');
      expect(element().querySelector('.text-field__message')?.children.length).toBe(0);

      control.markAsTouched();
      await fixture.whenStable();

      expect(element().querySelector('.text-field__message .text-field__error')).not.toBeNull();
    });

    it('shows the error once touched, and marks the field invalid', async () => {
      await render('');
      fixture.componentInstance.hint.set('Shown on the menu');

      control.markAsTouched();
      await fixture.whenStable();

      const error = element().querySelector('.text-field__error');
      expect(error?.textContent).toContain('Enter a name');
      expect(element().querySelector('.text-field--error')).not.toBeNull();
      expect(element().querySelector('.text-field__help')).toBeNull();
      expect(field()?.getAttribute('aria-invalid')).toBe('true');
      expect(field()?.getAttribute('aria-describedby')).toContain(error?.id);
    });

    it('marks the field invalid when it is already invalid at first render', async () => {
      control = new FormControl<string | null>('', { validators: Validators.required });
      control.markAsTouched();
      fixture = TestBed.createComponent(HostComponent);
      fixture.componentRef.setInput('control', control);
      await fixture.whenStable();

      expect(field()?.getAttribute('aria-invalid')).toBe('true');
      expect(element().querySelector('.mat-form-field-invalid')).not.toBeNull();
    });

    it('clears the invalid state again', async () => {
      await render('');
      control.markAsTouched();
      await fixture.whenStable();
      expect(field()?.getAttribute('aria-invalid')).toBe('true');

      control.setValue('Tea');
      await fixture.whenStable();

      expect(field()?.getAttribute('aria-invalid')).toBe('false');
      expect(element().querySelector('.mat-form-field-invalid')).toBeNull();
    });

    it('shows a server error set on the control', async () => {
      await render('Tea');

      control.setErrors({ server: 'This name is taken' });
      control.markAsTouched();
      await fixture.whenStable();

      expect(element().querySelector('.text-field__error')?.textContent).toContain(
        'This name is taken'
      );
    });

    it('removes the error once the value is valid', async () => {
      await render('');
      control.markAsTouched();
      await fixture.whenStable();

      control.setValue('Tea');
      await fixture.whenStable();

      expect(element().querySelector('.text-field__error')).toBeNull();
    });
  });

  it('applies the size modifiers and placeholder', async () => {
    await render();

    fixture.componentInstance.large.set(true);
    fixture.componentInstance.compact.set(true);
    fixture.componentInstance.placeholder.set('Type here');
    await fixture.whenStable();

    expect(element().querySelector('.text-field--large')).not.toBeNull();
    expect(element().querySelector('.text-field--compact')).not.toBeNull();
    expect(field()?.placeholder).toBe('Type here');
  });

  it('works without a form control', async () => {
    const standalone = TestBed.createComponent(TextFieldComponent);
    standalone.componentRef.setInput('label', 'Name');

    await standalone.whenStable();

    expect(standalone.nativeElement.querySelector('input')).not.toBeNull();
  });
});
