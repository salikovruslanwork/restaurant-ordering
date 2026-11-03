import { backoffDelay } from './backoff';

describe('backoffDelay', () => {
  const options = { baseMs: 1000, maxMs: 8000 };

  it.each([
    [0, 1000],
    [1, 2000],
    [2, 4000],
    [3, 8000],
    [4, 8000],
    [30, 8000]
  ])('doubles up to the maximum: attempt %i is at most %i ms', (attempt, expected) => {
    expect(backoffDelay(attempt, options, () => 1)).toBe(expected);
  });

  it('keeps at least half of the delay', () => {
    expect(backoffDelay(1, options, () => 0)).toBe(1000);
  });

  it('stays in range with the default options and real randomness', () => {
    const delay = backoffDelay(0);

    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThanOrEqual(1000);
  });
});
