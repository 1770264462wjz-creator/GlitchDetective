import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import {
  CreateLevelInput,
  LEVEL_STORE,
  LEVEL_STATUS,
  LevelStore,
  StoredLevel,
  UpdateLevelInput,
} from './level-store.interface';
import {
  LevelDetail,
  LevelListQuery,
  LevelListResult,
  LevelSummary,
} from './level.types';
import { validateLevelContent, LevelContent } from './level-content.validator';

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

/** 管理摘要：summary + 状态（docs/11 §6） */
export type AdminLevelSummary = LevelSummary & { level_status: number };

function toAdminSummary(level: StoredLevel): AdminLevelSummary {
  return { ...toSummary(level), level_status: level.status };
}

@Injectable()
export class LevelService {
  constructor(@Inject(LEVEL_STORE) private readonly store: LevelStore) {}

  /** 客户端列表：仅已发布关卡（docs/11 §6 status=3） */
  list(query: LevelListQuery): LevelListResult {
    const { chapterId, puzzleType, page, pageSize } = query;

    let items = this.store.findPublished();
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

  /** 管理端列表：全部状态，可选 status 过滤（docs/11 §6） */
  adminList(status?: number): AdminLevelSummary[] {
    let items = this.store.findAll();
    if (status != null) {
      items = items.filter((l) => l.status === status);
    }
    items.sort((a, b) => a.globalNo - b.globalNo);
    return items.map(toAdminSummary);
  }

  getDetail(levelId: string): LevelDetail {
    const globalNo = Number(levelId);
    const level = this.store.findByGlobalNo(globalNo);
    if (!level) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '关卡不存在');
    }
    return toDetail(level);
  }

  /** 关卡总数（存档模块推进 maxLevel 上限用，仅计已发布） */
  getTotalCount(): number {
    return this.store.findPublished().length;
  }

  /** 创建草稿：序号由服务端分配，先规范化再校验（R01-R20），失败拒绝入库（docs/11 §4.1） */
  createDraft(input: CreateLevelInput): AdminLevelSummary {
    const globalNo = this.store.nextGlobalNo();
    const normalized = this.normalizeContentForNo(input.content, globalNo);
    const result = validateLevelContent(normalized, { globalNo });
    if (!result.valid) {
      throw new BusinessException(
        ErrorCode.LEVEL_DATA_INVALID,
        `关卡内容校验失败：${result.errors.join('；')}`,
      );
    }
    const level = this.store.create({ ...input, content: normalized });
    return toAdminSummary(level);
  }

  /** 更新关卡内容：校验通过才写；仅草稿/已下线可改（docs/11 §6） */
  updateLevel(globalNo: number, input: UpdateLevelInput): AdminLevelSummary {
    const level = this.store.findByGlobalNo(globalNo);
    if (!level) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '关卡不存在');
    }
    if (
      level.status !== LEVEL_STATUS.DRAFT &&
      level.status !== LEVEL_STATUS.OFFLINE
    ) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '仅草稿或已下线关卡可编辑');
    }
    const normalized = this.normalizeContentForNo(input.content, globalNo);
    const result = validateLevelContent(normalized, { globalNo });
    if (!result.valid) {
      throw new BusinessException(
        ErrorCode.LEVEL_DATA_INVALID,
        `关卡内容校验失败：${result.errors.join('；')}`,
      );
    }
    const updated = this.store.update(globalNo, { ...input, content: normalized });
    return toAdminSummary(updated!);
  }

  /** 按系统分配的全局序号规范化 levelId / bugLog.id（R02/R16 一致性，序号由服务端分配） */
  private normalizeContentForNo(
    content: LevelContent,
    globalNo: number,
  ): LevelContent {
    return {
      ...content,
      levelId: `level_${String(globalNo).padStart(3, '0')}`,
      bugLog: content.bugLog
        ? {
            ...content.bugLog,
            id: `Bug${String(globalNo).padStart(3, '0')}`,
          }
        : content.bugLog,
    };
  }

  /** 删除草稿（docs/11 §6：仅 status=1 可删） */
  deleteDraft(globalNo: number): void {
    const level = this.store.findByGlobalNo(globalNo);
    if (!level) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '关卡不存在');
    }
    if (level.status !== LEVEL_STATUS.DRAFT) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '仅草稿可删除');
    }
    this.store.delete(globalNo);
  }

  /** 状态流转（docs/11 §6）：1→2 提交审核 / 2→1 打回 / 2→3 发布 / 3→4 下线 */
  transitionStatus(
    globalNo: number,
    action: 'submit' | 'reject' | 'approve' | 'offline',
  ): AdminLevelSummary {
    const level = this.store.findByGlobalNo(globalNo);
    if (!level) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '关卡不存在');
    }

    const validTransitions: Record<string, number[]> = {
      submit: [LEVEL_STATUS.DRAFT],
      reject: [LEVEL_STATUS.REVIEWING],
      approve: [LEVEL_STATUS.REVIEWING],
      offline: [LEVEL_STATUS.PUBLISHED],
    };
    const allowedFrom = validTransitions[action];
    if (!allowedFrom.includes(level.status)) {
      throw new BusinessException(
        ErrorCode.PARAM_INVALID,
        `非法状态流转：${level.status} 不可执行 ${action}`,
      );
    }

    const nextStatus: Record<string, 1 | 2 | 3 | 4> = {
      submit: LEVEL_STATUS.REVIEWING,
      reject: LEVEL_STATUS.DRAFT,
      approve: LEVEL_STATUS.PUBLISHED,
      offline: LEVEL_STATUS.OFFLINE,
    };
    const updated = this.store.setStatus(globalNo, nextStatus[action]);
    return toAdminSummary(updated!);
  }
}
