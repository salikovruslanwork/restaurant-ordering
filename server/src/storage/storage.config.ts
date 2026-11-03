import { fileURLToPath } from 'node:url';

export const DATA_DIR = fileURLToPath(new URL('../../data', import.meta.url));
export const SEED_FILE = `${DATA_DIR}/seed.json`;
export const DATA_FILE = `${DATA_DIR}/db.json`;
export const SAVE_DELAY_MS = 300;
// Tests keep everything in memory and never touch the data files.
export const STORAGE_ENABLED = !process.env['VITEST'];
