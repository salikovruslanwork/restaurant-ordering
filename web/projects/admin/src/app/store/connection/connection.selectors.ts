import { createSelector } from '@ngrx/store';

import { connectionFeature } from '@shared/data-access';

export const selectIsReadOnly = createSelector(connectionFeature.selectIsLive, (isLive) => !isLive);
