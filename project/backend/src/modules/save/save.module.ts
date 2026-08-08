import { Module } from '@nestjs/common';
import { LevelModule } from '../level/level.module';
import { SAVE_STORE } from './save-store.interface';
import { SaveController } from './save.controller';
import { SaveService } from './save.service';
import { MemorySaveStore } from './stores/memory-save.store';

/**
 * 进度存档模块（docs/08 §3.1）。
 * M2 内存存储占位（SAVE_STORE token），M3 迁移 MySQL 时替换 provider 即可。
 */
@Module({
  imports: [LevelModule],
  controllers: [SaveController],
  providers: [
    { provide: SAVE_STORE, useClass: MemorySaveStore },
    SaveService,
  ],
})
export class SaveModule {}