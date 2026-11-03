import { Pipe, type PipeTransform } from '@angular/core';

import { pluralize } from '@shared/util';

@Pipe({ name: 'pluralize' })
export class PluralizePipe implements PipeTransform {
  transform(count: number, one: string, many?: string): string {
    return pluralize(count, one, many);
  }
}
