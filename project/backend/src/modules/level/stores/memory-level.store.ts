import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LevelStore, StoredLevel } from '../level-store.interface';
import { LevelContent, validateLevelContent } from '../level-content.validator';
import { levelOneContent } from './seed-level-001';
import { levelTwoContent } from './seed-level-002';
import { levelThreeContent } from './seed-level-003';

/**
 * 内存关卡源（M2 联调用）。
 * 启动时对全部种子关卡执行 R01-R20 校验，失败即抛错，保证脏数据不进 API。
 * M3 替换为 MySQL 实现（gd_level 表 + 首次启动同步）。
 */
@Injectable()
export class MemoryLevelStore implements LevelStore, OnModuleInit {
  private readonly logger = new Logger(MemoryLevelStore.name);
  private readonly levels: StoredLevel[] = [
    { globalNo: 1, chapterNo: 1, order: 1, content: levelOneContent },
    { globalNo: 2, chapterNo: 2, order: 2, content: levelTwoContent },
    { globalNo: 3, chapterNo: 2, order: 3, content: levelThreeContent },
  ];

  onModuleInit(): void {
    for (const level of this.levels) {
      const result = validateLevelContent(level.content, { globalNo: level.globalNo });
      if (!result.valid) {
        throw new Error(
          `种子关卡 level_${String(level.globalNo).padStart(3, '0')} 未通过内容校验：\n- ` +
            result.errors.join('\n- '),
        );
      }
      this.logger.log(
        `种子关卡加载完成：level_${String(level.globalNo).padStart(3, '0')} ${level.content.title}（${level.content.puzzleType} ★${level.content.difficulty}）`,
      );
    }
  }

  findAll(): StoredLevel[] {
    return this.levels;
  }

  findByGlobalNo(globalNo: number): StoredLevel | undefined {
    return this.levels.find((l) => l.globalNo === globalNo);
  }
}

export type { LevelContent };
