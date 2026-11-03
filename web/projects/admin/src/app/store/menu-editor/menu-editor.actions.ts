import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Category, CreateItemRequest, Id, MenuItem } from '@restaurant/contracts';
import type { ItemSaveError } from '@admin/models/item-edit-dialog.model';
import type { AvailabilityFilter, MoveDirection } from '@admin/models/menu-editor.model';

export const menuEditorActions = createActionGroup({
  source: 'Menu Editor',
  events: {
    'Start Category Edit': props<{ id: Id | null }>(),
    'Cancel Category Edit': emptyProps(),
    'Save Category': props<{ id: Id | null; name: string }>(),
    'Category Saved': props<{ category: Category; isNew: boolean }>(),
    'Category Save Failed': props<{ error: string }>(),
    'Move Category': props<{ id: Id; direction: MoveDirection }>(),
    'Category Moved': props<{ id: Id; name: string; position: number }>(),
    'Category Move Failed': props<{ id: Id; error: string }>(),
    'Delete Category': props<{ id: Id; name: string }>(),
    'Category Deleted': props<{ id: Id; name: string }>(),
    'Category Delete Failed': props<{ id: Id; error: string; isNotEmpty: boolean }>(),
    'Filter Items By Category': props<{ categoryId: Id | null }>(),
    'Filter Items By Availability': props<{ availability: AvailabilityFilter }>(),
    'Clear Item Filters': emptyProps(),
    'Start Item Edit': props<{ id: Id | null }>(),
    'Cancel Item Edit': emptyProps(),
    'Save Item': props<{ id: Id | null; request: CreateItemRequest }>(),
    'Item Saved': props<{ item: MenuItem; isNew: boolean }>(),
    'Item Save Failed': props<{ error: ItemSaveError }>(),
    'Change Item Availability': props<{ id: Id; isAvailable: boolean }>(),
    'Item Availability Changed': props<{ item: MenuItem }>(),
    'Item Availability Failed': props<{ id: Id; name: string; error: string }>(),
    'Delete Item': props<{ id: Id; name: string }>(),
    'Item Deleted': props<{ id: Id; name: string }>(),
    'Item Delete Failed': props<{ id: Id; error: string }>(),
    'Fresh Ended': props<{ ids: Id[] }>()
  }
});
