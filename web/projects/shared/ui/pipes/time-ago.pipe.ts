import { Pipe, type PipeTransform } from '@angular/core';

import { timeAgo } from '@shared/util';

@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(date: string, now: number): string {
    return timeAgo(date, now);
  }
}
