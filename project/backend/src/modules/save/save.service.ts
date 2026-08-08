import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/constants/error-code';
import { BusinessException } from '../../common/exceptions/business.exception';
import { LevelService } from '../level/level.service';
import { SAVE_STORE, SaveStore } from './save-store.interface';
import {
  BugLogItem,
  PerLevelRecord,
  ProgressSnapshot,
  ProgressSummary,
  ReportProgressInput,
  ReportProgressResult,
  SkillItem,
  StoredBugLog,
  StoredUserProgress,
  isBetterThan,
} from './save.types';
import { MemorySaveStore } from './stores/memory-save.store';

/** 最低支持客户端版本（docs/06 §1 网关校验：低于则 1004） */
const MIN_CLIENT_VERSION = '1.0.0';

/** 阶段二接入 gd_user_skill 前返回的种子能力定义（对应 docs/08 §3.6 响应 skills） */
const SKILL_SEEDS: SkillItem[] = [
  { skill_key: 'observe', name: '观察', level: 1, exp: 0 },
  { skill_key: 'investigate', name: '调查', level: 1, exp: 0 },
  { skill_key: 'hint', name: '提示', level: 1, exp: 0 },
];

/** 简单 semver 比较（仅支持 x.y.z 数字段）：a>b 返回 1，a<b 返回 -1，相等返回 0 */
function compareSemver(a: string, b: string): number {
  const ap = a.split('.').map((s) => Number(s));
  const bp = b.split('.').map((s) => Number(s));
  for (let i = 0; i < 3; i++) {
    const x = ap[i] ?? 0;
    const y = bp[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/**
 * 当前关卡 = 已解锁范围内第一个未通关关（docs/08 §3.6 current_level_id 语义）；
 * 已解锁全部通关则停留在最后一关。
 */
function computeCurrentLevel(p: StoredUserProgress): number {
  for (let no = 1; no <= p.maxLevel; no++) {
    if (!p.perLevel[String(no)]?.finished) return no;
  }
  return p.maxLevel;
}

function toBugLogItem(item: StoredBugLog): BugLogItem {
  return {
    bug_no: item.bugNo,
    level_id: item.levelId,
    content: item.content,
    unlocked_at: item.unlockedAt,
  };
}

function summarize(p: StoredUserProgress): ProgressSummary {
  return {
    max_level: p.maxLevel,
    stars_total: p.starsTotal,
    finished_count: p.finishedCount,
  };
}

@Injectable()
export class SaveService {
  /** 未登录占位用户（user 模块落地前由鉴权上下文替换，收起自 docs/08 M3 阶段约束） */
  static readonly DEFAULT_USER_ID = '1';

  constructor(
    @Inject(SAVE_STORE) private readonly saveStore: SaveStore,
    private readonly levelService: LevelService,
  ) {}

  /**
   * 上报进度（docs/08 §3.5）。
   * 取优规则：先看通关，再看星级，再看用时；通关解锁 Bug 日志并触发下一关解锁。
   */
  reportProgress(
    userId: string,
    input: ReportProgressInput,
  ): ReportProgressResult {
    // 版本闸门：低于最低支持版本拒绝
    if (
      input.clientVersion != null &&
      compareSemver(input.clientVersion, MIN_CLIENT_VERSION) < 0
    ) {
      throw new BusinessException(ErrorCode.CLIENT_VERSION_TOO_LOW);
    }

    // 关卡校验：不存在 → 1003 / RESOURCE_NOT_FOUND
    const detail = this.levelService.getDetail(input.levelId);
    const levelNo = Number(detail.level_id);

    const profile =
      this.saveStore.findByUserId(userId) ??
      MemorySaveStore.defaultFor(userId);

    // 越级校验：仅允许上报已解锁关卡（level_no <= maxLevel，docs/08 §3.5）
    if (levelNo > profile.maxLevel) {
      throw new BusinessException(ErrorCode.LEVEL_LOCKED, '关卡未解锁，不允许越级上报');
    }

    const key = String(levelNo);
    const prev = profile.perLevel[key];
    const record: PerLevelRecord = {
      stars: input.stars,
      finished: input.finished,
      timeMs: input.timeMs,
      hintUsed: input.hintUsed ?? prev?.hintUsed ?? 0,
    };

    // 未优于已有记录：存档不变，仅上报被接受（best_updated=false）
    if (prev && !isBetterThan(record, prev)) {
      profile.currentLevelId = computeCurrentLevel(profile);
      this.saveStore.upsert(profile);
      return {
        accepted: true,
        best_updated: false,
        progress: summarize(profile),
        rewards: { stars_gained: 0, bug_log_unlocked: null },
      };
    }

    const wasFinished = prev?.finished ?? false;
    const prevStars = prev?.stars ?? 0;
    profile.perLevel[key] = record;

    let starsGained = 0;
    if (record.finished) {
      // 通关才结算星星，差值累积，不重复累计
      starsGained = Math.max(0, record.stars - prevStars);
      profile.starsTotal += starsGained;
      if (!wasFinished) profile.finishedCount++;

      const total = this.levelService.getTotalCount();
      profile.maxLevel = Math.min(
        Math.max(profile.maxLevel, levelNo + 1),
        total,
      );

      const best = profile.bestTimeMs[key];
      if (best == null || record.timeMs < best) {
        profile.bestTimeMs[key] = record.timeMs;
      }
    }

    // Bug 日志解锁：通关且领取，按 user+level 唯一（gd_bug_log 唯一键）
    let bugLogUnlocked: BugLogItem | null = null;
    const bugLogUnlockable =
      record.finished &&
      input.bugUnlocked === true &&
      !profile.bugLogs.some((b) => b.levelId === key);
    if (bugLogUnlockable) {
      const bug = detail.content.bugLog;
      const item: StoredBugLog = {
        bugNo: bug.id,
        levelId: key,
        content: bug.detail,
        unlockedAt: new Date().toISOString(),
      };
      profile.bugLogs.push(item);
      bugLogUnlocked = toBugLogItem(item);
    }

    profile.currentLevelId = computeCurrentLevel(profile);
    this.saveStore.upsert(profile);

    return {
      accepted: true,
      best_updated: true,
      progress: summarize(profile),
      rewards: { stars_gained: starsGained, bug_log_unlocked: bugLogUnlocked },
    };
  }

  /**
   * 拉取进度快照（docs/08 §3.6）。
   * 未存档用户返回初始进度（1 号关可玩、零星星、无 Bug 日志）。
   */
  getProgress(userId: string): ProgressSnapshot {
    const profile =
      this.saveStore.findByUserId(userId) ??
      MemorySaveStore.defaultFor(userId);

    return {
      progress: {
        current_level_id: String(computeCurrentLevel(profile)),
        max_level: profile.maxLevel,
        stars_total: profile.starsTotal,
        finished_count: profile.finishedCount,
        best_time_ms: { ...profile.bestTimeMs },
        extra: { ...profile.extra },
      },
      skills: [...SKILL_SEEDS],
      recent_bug_logs: [...profile.bugLogs]
        .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
        .slice(0, 10)
        .map(toBugLogItem),
    };
  }
}