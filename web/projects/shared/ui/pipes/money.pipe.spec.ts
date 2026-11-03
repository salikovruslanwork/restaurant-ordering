import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  it.each([
    [1250, '$12.50'],
    [0, '$0.00'],
    [5, '$0.05'],
    [123456, '$1,234.56'],
    [1999, '$19.99']
  ])('formats %i cents as %s', (cents, expected) => {
    expect(new MoneyPipe().transform(cents)).toBe(expected);
  });
});
