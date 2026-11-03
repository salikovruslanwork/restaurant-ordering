import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  get<T>(key: string): T | null {
    return this.attempt(() => JSON.parse(localStorage.getItem(key) ?? 'null') as T);
  }

  set(key: string, value: unknown): void {
    this.attempt(() => localStorage.setItem(key, JSON.stringify(value)));
  }

  remove(key: string): void {
    this.attempt(() => localStorage.removeItem(key));
  }

  // Storage can throw in private windows or when full; the app then keeps its state in memory.
  private attempt<T>(action: () => T): T | null {
    try {
      return action();
    } catch {
      return null;
    }
  }
}
