import { DEFAULT_BACKOFF } from './config/backoff.config';
import type { BackoffOptions } from './models/backoff.model';

// Half of the delay is random, so clients don't all reconnect at the same moment.
export function backoffDelay(
  attempt: number,
  options: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random
): number {
  const delay = Math.min(options.maxMs, options.baseMs * 2 ** attempt);
  return Math.round(delay / 2 + (delay / 2) * random());
}
