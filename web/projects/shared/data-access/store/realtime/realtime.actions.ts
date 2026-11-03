import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { EventEnvelope } from '@restaurant/contracts';

export const realtimeActions = createActionGroup({
  source: 'Realtime',
  events: {
    'Stream Opened': emptyProps(),
    'Stream Lost': emptyProps(),
    'Event Received': props<{ envelope: EventEnvelope }>()
  }
});
