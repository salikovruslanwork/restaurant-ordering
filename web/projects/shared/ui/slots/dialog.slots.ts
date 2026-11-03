import { Directive } from '@angular/core';

@Directive({ selector: '[appDialogTitle]' })
export class DialogTitleDirective {}

@Directive({ selector: '[appDialogIcon]' })
export class DialogIconDirective {}

@Directive({ selector: '[appDialogContent]' })
export class DialogContentDirective {}

@Directive({ selector: '[appDialogActions]' })
export class DialogActionsDirective {}
