import type { EventEnvelope } from '@restaurant/contracts';

export enum RealtimeStream {
  Admin = 'admin',
  Customer = 'customer'
}

export enum RealtimeMessageKind {
  Opened = 'opened',
  Envelope = 'envelope',
  Lost = 'lost'
}

export type RealtimeMessage =
  | { kind: RealtimeMessageKind.Opened }
  | { kind: RealtimeMessageKind.Envelope; envelope: EventEnvelope }
  | { kind: RealtimeMessageKind.Lost };
