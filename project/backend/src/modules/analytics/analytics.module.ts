import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EVENT_STORE } from './event-store.interface';
import { MemoryEventStore } from './stores/memory-event.store';

/**
 * 埋点模块（docs/08 §3.13、docs/10）。
 * M2 内存存储占位（EVENT_STORE token），M3 迁移 MySQL 时替换 provider（gd_event 表）。
 */
@Module({
  controllers: [AnalyticsController],
  providers: [
    { provide: EVENT_STORE, useClass: MemoryEventStore },
    AnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
