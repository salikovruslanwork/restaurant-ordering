import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';

import { createMenuSeed } from '../menu/menu.seed.js';
import { DATA_DIR, DATA_FILE, SEED_FILE, STORAGE_ENABLED } from './storage.config.js';
import type { StoredData } from './storage.model.js';

let loaded: StoredData | null = null;

// db.json is the working copy; a missing one starts again from seed.json, the full mock data.
export function loadData(): StoredData {
  if (loaded) {
    return loaded;
  }
  if (!STORAGE_ENABLED) {
    return { ...createMenuSeed(), orders: [] };
  }
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(SEED_FILE)) {
    writeFileSync(SEED_FILE, JSON.stringify({ ...createMenuSeed(), orders: [] }));
  }
  if (!existsSync(DATA_FILE)) {
    copyFileSync(SEED_FILE, DATA_FILE);
  }
  loaded = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as StoredData;
  return loaded;
}

// Writing to a temp file and renaming it means a crash never leaves half a file behind.
export function saveData(data: StoredData): void {
  const temp = `${DATA_FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(data));
  renameSync(temp, DATA_FILE);
}
