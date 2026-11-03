export enum DialogSize {
  Small = 'small',
  Form = 'form',
  Medium = 'medium',
  Wide = 'wide'
}

export enum DialogTone {
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

export interface DialogOptions {
  data?: unknown;
  size?: DialogSize;
  disableClose?: boolean;
  isAlert?: boolean;
}
