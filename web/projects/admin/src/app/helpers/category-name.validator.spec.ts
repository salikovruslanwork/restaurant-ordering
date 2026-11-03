import { FormControl } from '@angular/forms';

import { categoryNameValidator } from './category-name.validator';

describe('categoryNameValidator', () => {
  const validate = (value: string, others: string[] = []) =>
    categoryNameValidator(() => others)(new FormControl(value));

  it('requires a name that isn’t only spaces', () => {
    expect(validate('')).toEqual({ required: true });
    expect(validate('   ')).toEqual({ required: true });
  });

  it('limits the trimmed length to 30 characters', () => {
    expect(validate(`  ${'a'.repeat(30)}  `)).toBeNull();
    expect(validate('a'.repeat(31))).toEqual({ maxlength: true });
  });

  it('rejects a name another category has, ignoring case and spaces', () => {
    expect(validate(' soups ', ['Soups', 'Tea'])).toEqual({ taken: true });
    expect(validate('Desserts', ['Soups', 'Tea'])).toBeNull();
  });
});
