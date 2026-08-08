import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { MAX_BATCH_SIZE } from '../event-dictionary';

/** 单条事件（docs/08 §3.13 事件数组元素） */
export class EventItemDto {
  /** 客户端幂等 ID（UUID，docs/10 §5.1） */
  @IsString({ message: 'event_id 必填且为字符串' })
  @Matches(/^[A-Za-z0-9\-_]{1,64}$/, { message: 'event_id 非法' })
  event_id!: string;

  @IsString({ message: 'event_name 必填且为字符串' })
  @MinLength(1, { message: 'event_name 不能为空' })
  event_name!: string;

  @IsOptional()
  @IsObject({ message: 'properties 必须为对象' })
  properties?: Record<string, unknown>;

  /** 客户端事件时间（ISO8601） */
  @IsISO8601({}, { message: 'ts 必须为 ISO8601 时间' })
  ts!: string;
}

/** POST /events 请求体（docs/08 §3.13） */
export class ReportEventsDto {
  @IsArray({ message: 'events 必填且为数组' })
  @ArrayMaxSize(MAX_BATCH_SIZE, { message: `单批最多 ${MAX_BATCH_SIZE} 条` })
  @Type(() => EventItemDto)
  events!: EventItemDto[];
}
