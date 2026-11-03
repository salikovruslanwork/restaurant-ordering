import type { CartChangeKind, Cents, Order, PlaceOrderRequest } from '@restaurant/contracts';
import type { DialogTone } from '@shared/ui';

export enum CheckoutStep {
  Idle = 'idle',
  Review = 'review',
  Submitting = 'submitting',
  Conflict = 'conflict',
  Success = 'success',
  Error = 'error'
}

export enum CheckoutErrorKind {
  Connection = 'connection',
  Server = 'server'
}

export enum CheckoutBlock {
  Empty = 'empty',
  BlockedLines = 'blocked_lines'
}

export interface CheckoutAttempt {
  key: string;
  request: PlaceOrderRequest;
}

export interface CheckoutChange {
  kind: CartChangeKind;
  name: string | null;
  oldAmount: Cents | null;
  newAmount: Cents | null;
}

export interface CheckoutState {
  step: CheckoutStep;
  attempt: CheckoutAttempt | null;
  changes: CheckoutChange[];
  order: Order | null;
  errorKind: CheckoutErrorKind | null;
}

export interface CheckoutHero {
  title: string;
  icon: string;
  tone: DialogTone | null;
}
