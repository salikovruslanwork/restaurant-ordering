import { defer, filter, Observable, startWith, Subject } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';

import {
  ServerEventType,
  type EventEnvelope,
  type Id,
  type ServerEvent
} from '@restaurant/contracts';

import { EVENTS_OPTIONS, type EventsOptions } from './events.config.js';

@Injectable()
export class EventsService {
  private readonly events$ = new Subject<EventEnvelope>();
  private readonly log: EventEnvelope[] = [];
  // Data is in memory, so a seq from before a restart must count as a gap; the clock guarantees it.
  private seq = Date.now();

  constructor(@Inject(EVENTS_OPTIONS) private readonly options: EventsOptions) {}

  get currentSeq(): number {
    return this.seq;
  }

  publish(event: ServerEvent): EventEnvelope {
    this.seq += 1;
    const envelope = this.createEnvelope(event);
    this.log.push(envelope);
    if (this.log.length > this.options.logSize) {
      this.log.shift();
    }
    this.events$.next(envelope);
    return envelope;
  }

  adminStream(since: number | null): Observable<EventEnvelope> {
    return this.stream(since);
  }

  customerStream(clientId: Id, since: number | null): Observable<EventEnvelope> {
    return this.stream(since).pipe(filter(({ event }) => this.isVisibleTo(event, clientId)));
  }

  private stream(since: number | null): Observable<EventEnvelope> {
    return defer(() => this.events$.pipe(startWith(...this.replay(since))));
  }

  private replay(since: number | null): EventEnvelope[] {
    if (since === null || since === this.seq) {
      return [];
    }

    const oldestSeq = this.log[0]?.seq;
    if (oldestSeq === undefined || since > this.seq || since < oldestSeq - 1) {
      return [this.createEnvelope({ type: ServerEventType.Resync })];
    }
    return this.log.slice(since - oldestSeq + 1);
  }

  private isVisibleTo(event: ServerEvent, clientId: Id): boolean {
    switch (event.type) {
      case ServerEventType.OrderCreated:
      case ServerEventType.OrderUpdated:
        return event.order.clientId === clientId;
      default:
        return true;
    }
  }

  private createEnvelope(event: ServerEvent): EventEnvelope {
    return { seq: this.seq, at: new Date().toISOString(), event };
  }
}
