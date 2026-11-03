export interface EventsOptions {
  logSize: number;
  heartbeatIntervalMs: number;
}

export const EVENTS_OPTIONS = 'EVENTS_OPTIONS';

export const DEFAULT_EVENTS_OPTIONS: EventsOptions = {
  logSize: 1000,
  heartbeatIntervalMs: 15_000
};

export const HEARTBEAT_COMMENT = 'ping';
