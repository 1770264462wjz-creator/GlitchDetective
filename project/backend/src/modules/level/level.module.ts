import { Module } from '@nestjs/common';
import { LevelController } from './level.controller';
import { LevelService } from './level.service';
import { LEVEL_STORE } from './level-store.interface';
import { MemoryLevelStore } from './stores/memory-level.store';

@Module({
  controllers: [LevelController],
  providers: [
    { provide: LEVEL_STORE, useClass: MemoryLevelStore },
    LevelService,
  ],
  exports: [LevelService],
})
export class LevelModule {}
