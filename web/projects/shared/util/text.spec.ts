import { pluralize } from './text';

describe('pluralize', () => {
  it.each([
    [0, '0 items'],
    [1, '1 item'],
    [2, '2 items']
  ])('counts %i', (count, expected) => {
    expect(pluralize(count, 'item')).toBe(expected);
  });

  it('takes an irregular plural', () => {
    expect(pluralize(3, 'category', 'categories')).toBe('3 categories');
    expect(pluralize(1, 'category', 'categories')).toBe('1 category');
  });
});
