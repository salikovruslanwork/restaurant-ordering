import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';

import type { Id, MenuItem } from '@restaurant/contracts';
import { MenuItemComponent } from '@menu/components/blocks/menu-item/menu-item.component';
import { getGridLayout, observeWidth, toGridRows } from '@menu/helpers/menu-grid';
import type { MenuItemQuantity } from '@menu/models/cart.model';
import type { MenuGridRow } from '@menu/models/menu-grid.model';

@Component({
  selector: 'app-menu-grid',
  imports: [
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    MenuItemComponent
  ],
  templateUrl: './menu-grid.component.html',
  styleUrl: './menu-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuGridComponent {
  readonly items = input.required<MenuItem[]>();
  readonly mobile = input(false, { transform: booleanAttribute });
  readonly quantities = input<Record<Id, number>>({});

  readonly added = output<MenuItem>();
  readonly quantityChanged = output<MenuItemQuantity>();
  readonly openPriceRequested = output<MenuItem>();

  private readonly width = toSignal(
    observeWidth(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement),
    {
      initialValue: 0
    }
  );

  protected readonly layout = computed(() => getGridLayout(this.width(), this.mobile()));
  protected readonly rows = computed(() => toGridRows(this.items(), this.layout().columns));
  // Before the first measurement the desktop grid would draw one column and then jump.
  protected readonly isMeasuring = computed(() => !this.mobile() && this.width() === 0);

  protected trackRow(_index: number, row: MenuGridRow): number {
    return row.index;
  }
}
