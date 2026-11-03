import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = Date.parse('2026-11-02T12:00:00.000Z');

  it.each([
    ['2026-11-02T11:59:30.000Z', 'Just now'],
    ['2026-11-02T11:55:00.000Z', '5 min ago'],
    ['2026-11-02T11:00:01.000Z', '59 min ago'],
    ['2026-11-02T09:00:00.000Z', '3 h ago']
  ])('shows %s as “%s”', (date, expected) => {
    expect(pipe.transform(date, now)).toBe(expected);
  });
});
