import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  type EffectCleanupRegisterFn
} from '@angular/core';

import { ConnectionStatus } from '@shared/data-access';

import {
  BACK_ONLINE_DURATION_MS,
  BACK_ONLINE_MESSAGE,
  INITIAL_CONNECTION_HISTORY,
  OFFLINE_MESSAGE,
  RECONNECTING_MESSAGE
} from '../../config/connection-banner.config';
import { ConnectionBannerKind, type ConnectionHistory } from '../../models/connection-banner.model';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-connection-banner',
  imports: [IconComponent, SpinnerComponent],
  templateUrl: './connection-banner.component.html',
  styleUrl: './connection-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionBannerComponent {
  readonly status = input.required<ConnectionStatus>();
  readonly reconnectingMessage = input(RECONNECTING_MESSAGE);
  readonly offlineMessage = input(OFFLINE_MESSAGE);

  private readonly history = linkedSignal<ConnectionStatus, ConnectionHistory>({
    source: this.status,
    computation: (status, previous) => this.getHistory(status, previous?.value)
  });
  private readonly isBackOnline = computed(() => this.history().isBackOnline);

  protected readonly ConnectionBannerKind = ConnectionBannerKind;
  protected readonly backOnlineMessage = BACK_ONLINE_MESSAGE;
  protected readonly kind = computed(() =>
    this.getKind(this.status(), this.history().hasBeenLive, this.isBackOnline())
  );

  constructor() {
    effect((onCleanup) => this.hideBackOnlineLater(this.isBackOnline(), onCleanup));
  }

  private getHistory(
    status: ConnectionStatus,
    previous = INITIAL_CONNECTION_HISTORY
  ): ConnectionHistory {
    if (status !== ConnectionStatus.Live) {
      return {
        hasBeenLive: previous.hasBeenLive,
        wasDisconnected: previous.hasBeenLive || status === ConnectionStatus.Offline,
        isBackOnline: false
      };
    }
    return { hasBeenLive: true, wasDisconnected: false, isBackOnline: previous.wasDisconnected };
  }

  private hideBackOnlineLater(isBackOnline: boolean, onCleanup: EffectCleanupRegisterFn): void {
    if (!isBackOnline) {
      return;
    }
    const timer = setTimeout(
      () => this.history.update((history) => ({ ...history, isBackOnline: false })),
      BACK_ONLINE_DURATION_MS
    );
    onCleanup(() => clearTimeout(timer));
  }

  // The very first connection also starts as "reconnecting", which isn't worth a banner.
  private getKind(
    status: ConnectionStatus,
    hasBeenLive: boolean,
    isBackOnline: boolean
  ): ConnectionBannerKind | null {
    if (status === ConnectionStatus.Offline) {
      return ConnectionBannerKind.Offline;
    }
    if (status === ConnectionStatus.Reconnecting) {
      return hasBeenLive ? ConnectionBannerKind.Reconnecting : null;
    }
    return isBackOnline ? ConnectionBannerKind.Online : null;
  }
}
