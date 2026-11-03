import { FormControl } from '@angular/forms';

import { moneyValidator } from './money-validator';

describe('moneyValidator', () => {
  it.each([
    ['', { required: true }],
    ['  ', { required: true }],
    ['abc', { format: true }],
    ['1.234', { format: true }],
    ['0', { min: true }],
    ['10.01', { max: true }],
    ['10', null],
    ['$9.50', null]
  ])('checks “%s”', (value, expected) => {
    expect(moneyValidator(() => 1000)(new FormControl(value))).toEqual(expected);
  });

  it('reads the limit on every check', () => {
    let max = 500;
    const validate = moneyValidator(() => max);

    expect(validate(new FormControl('6'))).toEqual({ max: true });
    max = 700;
    expect(validate(new FormControl('6'))).toBeNull();
  });
});
