import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { LEVEL_STORE, LevelStore, StoredLevel } from './level-store.interface';
import {
  LevelDetail,
  LevelListQuery,
  LevelListResult,
  LevelSummary,
} from './level.types';

const REWARD_STARS = 3;

function toSummary(level: StoredLevel): LevelSummary {
  return {
    level_id: String(level.globalNo),
    level_no: level.order,
    chapter_id: level.chapterNo,
    title: level.content.title,
    puzzle_type: level.content.puzzleType,
    difficulty: level.content.difficulty,
    reward_stars: REWARD_STARS,
    is_hidden: false,
    // M2 无玩家数据：默认全部解锁、未通关（M3 接入 gd_user_progress）
    unlocked: true,
    stars: 0,
    best_time_ms: null,
  };
}

function toDetail(level: StoredLevel): LevelDetail {
  const { globalNo } = level;
  return {
    level_id: String(globalNo),
    level_no: level.order,
    title: level.content.title,
    puzzle_type: level.content.puzzleType,
    difficulty: level.content.difficulty,
    schema_version: level.content.schemaVersion,
    reward_stars: REWARD_STARS,
    hint_ids: [`hint_${globalNo}_1`, `hint_${globalNo}_2`, `hint_${globalNo}_3`],
    content: level.content,
  };
}

@Injectable()
export class LevelService {
  constructor(@Inject(LEVEL_STORE) private readonly store: LevelStore) {}

  list(query: LevelListQuery): LevelListResult {
    const { chapterId, puzzleType, page, pageSize } = query;

    let items = this.store.findAll();
    if (chapterId != null) {
      items = items.filter((l) => l.chapterNo === chapterId);
    }
    if (puzzleType != null) {
      items = items.filter((l) => l.content.puzzleType === puzzleType);
    }
    items.sort((a, b) => a.globalNo - b.globalNo);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return {
      list: pageItems.map(toSummary),
      total,
      page,
      page_size: pageSize,
      has_more: start + pageItems.length < total,
    };
  }

  getDetail(levelId: string): LevelDetail {
    const globalNo = Number(levelId);
    const level = this.store.findByGlobalNo(globalNo);
    if (!level) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '关卡不存在');
    }
    return toDetail(level);
  }

  /** 关卡总数（存档模块推进 maxLevel 上限用） */
  getTotalCount(): number {
    return this.store.findAll().length;
  }
}
