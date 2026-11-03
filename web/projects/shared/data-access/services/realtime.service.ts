import { inject, Injectable } from '@angular/core';

import { defer, Observable, retry, tap, timer } from 'rxjs';

import type { EventEnvelope } from '@restaurant/contracts';
import { backoffDelay, isEventEnvelope } from '@shared/util';

import { API_URL } from '../config/api.config';
import { REALTIME_STREAM } from '../config/realtime.config';
import {
  RealtimeMessageKind,
  RealtimeStream,
  type RealtimeMessage
} from '../models/realtime.model';
import { ClientIdService } from './client-id.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly stream = inject(REALTIME_STREAM);
  private readonly clientId = inject(ClientIdService);

  connect(since: number): Observable<RealtimeMessage> {
    return defer(() => {
      let lastSeq = since;
      let failures = 0;

      return defer(() => this.open(lastSeq)).pipe(
        tap((message) => {
          if (message.kind === RealtimeMessageKind.Opened) {
            failures = 0;
          }
          if (message.kind === RealtimeMessageKind.Envelope) {
            lastSeq = message.envelope.seq;
          }
        }),
        retry({
          delay: () => {
            failures += 1;
            return timer(backoffDelay(failures - 1));
          }
        })
      );
    });
  }

  // While CONNECTING the browser retries by itself and sends Last-Event-ID. It gives up (CLOSED)
  // on a non-SSE response, such as a proxy error, so that case errors and connect() reopens it.
  private open(since: number): Observable<RealtimeMessage> {
    return new Observable((subscriber) => {
      const source = new EventSource(this.buildUrl(since));

      source.onopen = () => subscriber.next({ kind: RealtimeMessageKind.Opened });
      source.onmessage = ({ data }: MessageEvent<string>) => {
        const envelope = this.parse(data);
        if (envelope) {
          subscriber.next({ kind: RealtimeMessageKind.Envelope, envelope });
        }
      };
      source.onerror = () => {
        subscriber.next({ kind: RealtimeMessageKind.Lost });
        if (source.readyState === EventSource.CLOSED) {
          subscriber.error(new Error('The event stream was closed.'));
        }
      };

      return () => source.close();
    });
  }

  private buildUrl(since: number): string {
    const url = `${API_URL}/events/${this.stream}?since=${since}`;
    return this.stream === RealtimeStream.Customer ? `${url}&clientId=${this.clientId.id}` : url;
  }

  private parse(data: string): EventEnvelope | null {
    try {
      const value: unknown = JSON.parse(data);
      if (isEventEnvelope(value)) {
        return value;
      }
    } catch {
      // Logged below, like any other invalid message.
    }
    console.warn('Skipped an invalid event message.', data);
    return null;
  }
}
