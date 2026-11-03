import type { BackoffOptions } from '../models/backoff.model';

export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 1000, maxMs: 30_000 };
