import { interval, map, merge, Observable } from 'rxjs';
import { Controller, Headers, Inject, Query, Sse, type MessageEvent } from '@nestjs/common';

import type { EventEnvelope } from '@restaurant/contracts';

import { AdminEventsQuery, CustomerEventsQuery } from './events-query.dto.js';
import { EVENTS_OPTIONS, HEARTBEAT_COMMENT, type EventsOptions } from './events.config.js';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    @Inject(EVENTS_OPTIONS) private readonly options: EventsOptions
  ) {}

  @Sse('admin')
  admin(
    @Query() query: AdminEventsQuery,
    @Headers('last-event-id') lastEventId?: string
  ): Observable<MessageEvent> {
    return this.toMessages(this.events.adminStream(this.resolveSince(lastEventId, query.since)));
  }

  @Sse('customer')
  customer(
    @Query() query: CustomerEventsQuery,
    @Headers('last-event-id') lastEventId?: string
  ): Observable<MessageEvent> {
    const since = this.resolveSince(lastEventId, query.since);
    return this.toMessages(this.events.customerStream(query.clientId, since));
  }

  private toMessages(envelopes$: Observable<EventEnvelope>): Observable<MessageEvent> {
    return merge(
      envelopes$.pipe(map((envelope) => ({ id: String(envelope.seq), data: envelope }))),
      interval(this.options.heartbeatIntervalMs).pipe(map(() => ({ comment: HEARTBEAT_COMMENT })))
    );
  }

  // On reconnect the browser repeats the original ?since= and adds a newer Last-Event-ID.
  private resolveSince(lastEventId: string | undefined, since: number | undefined): number | null {
    if (lastEventId !== undefined && /^\d+$/.test(lastEventId)) {
      return Number(lastEventId);
    }
    return since ?? null;
  }
}
