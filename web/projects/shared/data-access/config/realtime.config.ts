import { InjectionToken } from '@angular/core';

import { RealtimeStream } from '../models/realtime.model';

export const REALTIME_STREAM = new InjectionToken<RealtimeStream>('REALTIME_STREAM');

export const STREAM_RESTART_THROTTLE_MS = 5000;
