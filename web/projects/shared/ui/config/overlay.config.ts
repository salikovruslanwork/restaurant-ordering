import { InjectionToken } from '@angular/core';

export const DIALOG_DATA = new InjectionToken<unknown>('DIALOG_DATA');
export const DIALOG_TITLE_ID = new InjectionToken<string>('DIALOG_TITLE_ID');

export const OVERLAY_SCRIM_CLASS = 'overlay-scrim';
export const SHEET_PANEL_CLASS = 'sheet-panel';
export const DIALOG_PANEL_CLASS = 'dialog-panel';
export const MOBILE_MEDIA_QUERY = '(max-width: 599.98px)';
export const NOTIFICATION_DURATION_MS = 4500;
export const ERROR_NOTIFICATION_DURATION_MS = 8000;
