import { inject, Injectable } from '@angular/core';

import { CLIENT_ID_STORAGE_KEY } from '../config/client-id.config';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ClientIdService {
  private readonly storage = inject(StorageService);

  readonly id = this.storage.get<string>(CLIENT_ID_STORAGE_KEY) ?? this.create();

  private create(): string {
    const id = crypto.randomUUID();
    this.storage.set(CLIENT_ID_STORAGE_KEY, id);
    return id;
  }
}
