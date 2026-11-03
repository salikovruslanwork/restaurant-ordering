import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it.each([
    [0, '$0.00'],
    [450, '$4.50'],
    [123456, '$1,234.56']
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});
