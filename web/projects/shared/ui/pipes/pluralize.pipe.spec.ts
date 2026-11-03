import { PluralizePipe } from './pluralize.pipe';

describe('PluralizePipe', () => {
  const pipe = new PluralizePipe();

  it('counts with a regular plural', () => {
    expect(pipe.transform(1, 'item')).toBe('1 item');
    expect(pipe.transform(4, 'item')).toBe('4 items');
  });

  it('counts with an irregular plural', () => {
    expect(pipe.transform(2, 'category', 'categories')).toBe('2 categories');
  });
});
