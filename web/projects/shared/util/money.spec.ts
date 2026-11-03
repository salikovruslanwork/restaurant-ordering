import { capDiscount, lineTotal, orderTotal, parseMoney, subtotal } from './money';

describe('money', () => {
  it('multiplies a line total', () => {
    expect(lineTotal(450, 3)).toBe(1350);
  });

  it('adds a subtotal', () => {
    const lines = [
      { unitPrice: 450, quantity: 2 },
      { unitPrice: 2500, quantity: 1 }
    ];

    expect(subtotal(lines)).toBe(3400);
    expect(subtotal([])).toBe(0);
  });

  it.each([
    [500, 3400, 500],
    [3400, 3400, 3400],
    [3401, 3400, 3400],
    [-1, 3400, 0],
    [500, 0, 0]
  ])('caps a discount of %i on a subtotal of %i at %i', (discount, total, expected) => {
    expect(capDiscount(discount, total)).toBe(expected);
  });

  it('never lets the total go below zero', () => {
    expect(orderTotal(3400, 500)).toBe(2900);
    expect(orderTotal(3400, 3400)).toBe(0);
    expect(orderTotal(3400, 9999)).toBe(0);
  });

  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['12.', 1200],
    ['.5', 50],
    ['$1234.56', 123456],
    [' 25 ', 2500],
    ['0', 0],
    ['19.99', 1999],
    ['1.10', 110],
    ['4.35', 435],
    ['11,11', 1111],
    ['12,5', 1250],
    ['12,', 1200],
    [',5', 50]
  ])('parses %j as %i cents', (text, expected) => {
    expect(parseMoney(text)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    '.',
    ',',
    'abc',
    '12.345',
    '-5',
    '1.2.3',
    '12a',
    '12.5,5',
    '1,0222',
    '1,234',
    '1,234,56',
    '$1,234.56'
  ])('rejects %j', (text) => {
    expect(parseMoney(text)).toBeNull();
  });
});
