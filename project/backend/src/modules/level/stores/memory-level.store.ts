import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateLevelInput,
  LEVEL_STATUS,
  LevelStore,
  StoredLevel,
  UpdateLevelInput,
} from '../level-store.interface';
import { LevelContent, validateLevelContent } from '../level-content.validator';
import { levelOneContent } from './seed-level-001';
import { levelTwoContent } from './seed-level-002';
import { levelThreeContent } from './seed-level-003';

/**
 * 内存关卡源（M2 联调用，含管理写操作）。
 * 启动时对全部种子关卡执行 R01-R20 校验，失败即抛错，保证脏数据不进 API。
 * 种子关卡默认已发布（status=3，供客户端拉取）；新建关卡为草稿（status=1）。
 * M3 替换为 MySQL 实现（gd_level 表 + 首次启动同步）。
 */
@Injectable()
export class MemoryLevelStore implements LevelStore, OnModuleInit {
  private readonly logger = new Logger(MemoryLevelStore.name);
  private readonly levels: StoredLevel[] = [
    { globalNo: 1, chapterNo: 1, order: 1, status: LEVEL_STATUS.PUBLISHED, content: levelOneContent },
    { globalNo: 2, chapterNo: 2, order: 2, status: LEVEL_STATUS.PUBLISHED, content: levelTwoContent },
    { globalNo: 3, chapterNo: 2, order: 3, status: LEVEL_STATUS.PUBLISHED, content: levelThreeContent },
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
    return [...this.levels];
  }

  findPublished(): StoredLevel[] {
    return this.levels.filter((l) => l.status === LEVEL_STATUS.PUBLISHED);
  }

  findByGlobalNo(globalNo: number): StoredLevel | undefined {
    return this.levels.find((l) => l.globalNo === globalNo);
  }

  nextGlobalNo(): number {
    let max = 0;
    for (const l of this.levels) {
      if (l.globalNo > max) max = l.globalNo;
    }
    return max + 1;
  }

  create(input: CreateLevelInput): StoredLevel {
    const level: StoredLevel = {
      globalNo: this.nextGlobalNo(),
      chapterNo: input.chapterNo,
      order: input.chapterNo * 100 + input.content.order,
      status: LEVEL_STATUS.DRAFT,
      content: input.content,
    };
    this.levels.push(level);
    return level;
  }

  update(globalNo: number, input: UpdateLevelInput): StoredLevel | undefined {
    const level = this.findByGlobalNo(globalNo);
    if (!level) return undefined;
    level.content = input.content;
    if (input.chapterNo != null) {
      level.chapterNo = input.chapterNo;
      level.order = input.chapterNo * 100 + input.content.order;
    }
    return level;
  }

  setStatus(globalNo: number, status: 1 | 2 | 3 | 4): StoredLevel | undefined {
    const level = this.findByGlobalNo(globalNo);
    if (!level) return undefined;
    level.status = status;
    return level;
  }

  delete(globalNo: number): boolean {
    const idx = this.levels.findIndex((l) => l.globalNo === globalNo);
    if (idx < 0) return false;
    this.levels.splice(idx, 1);
    return true;
  }
}

export type { LevelContent };
