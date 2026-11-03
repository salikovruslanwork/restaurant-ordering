import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AdminEventsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since?: number;
}

export class CustomerEventsQuery extends AdminEventsQuery {
  @IsUUID()
  clientId!: string;
}
