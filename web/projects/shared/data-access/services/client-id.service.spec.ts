import { TestBed } from '@angular/core/testing';

import { CLIENT_ID_STORAGE_KEY } from '../config/client-id.config';
import { ClientIdService } from './client-id.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('ClientIdService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('creates a UUID and saves it', () => {
    const { id } = TestBed.inject(ClientIdService);

    expect(id).toMatch(UUID);
    expect(localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBe(JSON.stringify(id));
  });

  it('reuses the saved id', () => {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, JSON.stringify('saved-id'));

    expect(TestBed.inject(ClientIdService).id).toBe('saved-id');
  });

  it('still gives an id when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });

    expect(TestBed.inject(ClientIdService).id).toMatch(UUID);
  });
});
