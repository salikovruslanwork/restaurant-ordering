import { createActionGroup, emptyProps } from '@ngrx/store';

export const connectionActions = createActionGroup({
  source: 'Connection',
  events: {
    'Browser Online': emptyProps(),
    'Browser Offline': emptyProps(),
    'Request No Response': emptyProps()
  }
});
