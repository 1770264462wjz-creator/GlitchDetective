/**
 * 进度存档模块契约类型（docs/08 §3.5 POST /progress、§3.6 GET /progress）。
 * 字段命名遵循接口文档的 snake_case 出参约定。
 */

/** 单关最优成绩（内存存档 perLevel 明细，M3 迁移 MySQL 后走 extra JSON 兜底） */
export interface PerLevelRecord {
  stars: number;
  finished: boolean;
  timeMs: number;
  hintUsed: number;
}

/** Bug 日志收藏条目（gd_bug_log 行） */
export interface StoredBugLog {
  bugNo: string;
  levelId: string;
  content: string;
  unlockedAt: string; // ISO 8601
}

/** 存储层用户存档（对齐 gd_user_progress 表结构） */
export interface StoredUserProgress {
  userId: string;
  /** 当前关卡（globalNo），拉取存档时供客户端定位 */
  currentLevelId: number;
  /** 已解锁最大关（globalNo），初始 1 */
  maxLevel: number;
  starsTotal: number;
  finishedCount: number;
  /** levelId -> 通关最佳用时（gd_best_time_ms JSON） */
  bestTimeMs: Record<string, number>;
  /** levelId -> 单关最优记录（一期用内存明细，落库后走 extra JSON 兜底） */
  perLevel: Record<string, PerLevelRecord>;
  bugLogs: StoredBugLog[];
  /** 扩展存档（皮肤/设置等，一期保持空对象） */
  extra: Record<string, unknown>;
}

/** 上报进度入参（controller 转换后的领域对象） */
export interface ReportProgressInput {
  levelId: string;
  stars: number;
  timeMs: number;
  finished: boolean;
  hintUsed?: number;
  bugUnlocked?: boolean;
  clientVersion?: string;
}

/** 取最优判定：先看通关，再看星级，再看用时（docs/08 §3.5） */
export function isBetterThan(
  next: PerLevelRecord,
  prev: PerLevelRecord,
): boolean {
  if (next.finished !== prev.finished) return next.finished;
  if (next.stars !== prev.stars) return next.stars > prev.stars;
  if (next.timeMs !== prev.timeMs) return next.timeMs < prev.timeMs;
  return false;
}

/** 响应：进度概要（POST/GET 共用） */
export interface ProgressSummary {
  max_level: number;
  stars_total: number;
  finished_count: number;
}

/** 响应：能力快照（阶段二接入 gd_user_skill 前返回种子定义） */
export interface SkillItem {
  skill_key: string;
  name: string;
  level: number;
  exp: number;
}

/** 响应：Bug 日志条目（GET 出参 snake_case） */
export interface BugLogItem {
  bug_no: string;
  level_id: string;
  content: string;
  unlocked_at: string;
}

/** POST /progress 响应（docs/08 §3.5） */
export interface ReportProgressResult {
  accepted: boolean;
  best_updated: boolean;
  progress: ProgressSummary;
  rewards: {
    stars_gained: number;
    bug_log_unlocked: BugLogItem | null;
  };
}

/** GET /progress 响应（docs/08 §3.6） */
export interface ProgressSnapshot {
  progress: {
    current_level_id: string;
    max_level: number;
    stars_total: number;
    finished_count: number;
    best_time_ms: Record<string, number>;
    extra: Record<string, unknown>;
  };
  skills: SkillItem[];
  recent_bug_logs: BugLogItem[];
}