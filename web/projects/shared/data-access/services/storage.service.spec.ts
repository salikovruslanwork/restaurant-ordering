import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

describe('StorageService', () => {
  const service = () => TestBed.inject(StorageService);

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, reads and removes a value', () => {
    service().set('key', { count: 1 });
    expect(service().get('key')).toEqual({ count: 1 });

    service().remove('key');
    expect(service().get('key')).toBeNull();
  });

  it('reads nothing when the stored text is not JSON', () => {
    localStorage.setItem('key', 'not json');

    expect(service().get('key')).toBeNull();
  });

  it('keeps working when storage throws', () => {
    const blocked = () => {
      throw new Error('Blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    expect(service().get('key')).toBeNull();
    expect(() => service().set('key', 1)).not.toThrow();
    expect(() => service().remove('key')).not.toThrow();
  });
});
