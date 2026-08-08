/** 关卡数据结构（与后端 Schema v1 对齐，docs/04） */
export interface LevelContent {
  schemaVersion: string;
  levelId: string;
  chapterId: string;
  order: number;
  title: string;
  puzzleType: 'visual' | 'reverse' | 'target' | 'language' | 'detail';
  difficulty: number;
  unlock: { type: 'auto' } | { type: 'previous'; levelId: string };
  story: {
    intro: string;
    outro: string;
    introTalk?: string;
    outroTalk?: string;
  };
  scene: {
    background: string;
    bgm?: string;
    objects: LevelObject[];
    camera?: { initialZoom?: number; maxZoom?: number };
  };
  misleadLayer: { description: string; actions: LevelAction[] };
  truthLayer: {
    description: string;
    successMode: 'any' | 'sequence' | 'combo';
    actions: LevelAction[];
  };
  hints: LevelHint[];
  bugLog: { id: string; title: string; detail: string; reward?: { coins?: number; xp?: number } };
  tags?: string[];
}

export interface LevelObject {
  id: string;
  type: 'sprite' | 'label' | 'particle' | 'audio' | 'container';
  spriteKey?: string;
  text?: string;
  position: { x: number; y: number };
  scale?: number;
  zIndex?: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  interactive: boolean;
  actions?: LevelAction[];
}

export interface LevelAction {
  id: string;
  trigger: 'tap' | 'doubleTap' | 'longPress' | 'drag' | 'combine';
  targetId: string;
  payload?: { dragTo?: string; combineWith?: string };
  condition?: unknown;
  result: 'wrong' | 'right' | 'info';
  feedback?: {
    bugTalk?: string;
    text?: string;
    toast?: string;
    sound?: string;
    vibrate?: boolean;
  };
  onSuccess?: {
    setState?: Record<string, string>;
    showObject?: string[];
    hideObject?: string[];
    playAnim?: string;
    unlockBugLog?: boolean;
    gotoResult?: boolean;
  };
}

export interface LevelHint {
  level: 1 | 2 | 3;
  text: string;
  bugTalk?: string;
  cost?: { ad?: boolean; coins?: number };
  cooldownSeconds?: number;
}

/** 关卡摘要（管理列表项） */
export interface LevelSummary {
  level_id: string;
  level_no: number;
  chapter_id: number;
  title: string;
  puzzle_type: string;
  difficulty: number;
  reward_stars: number;
  is_hidden: boolean;
  unlocked: boolean;
  stars: number;
  best_time_ms: number | null;
  level_status: number;
}

/** 关卡详情（含 content） */
export interface LevelDetail {
  level_id: string;
  level_no: number;
  title: string;
  puzzle_type: string;
  difficulty: number;
  schema_version: string;
  reward_stars: number;
  hint_ids: string[];
  content: LevelContent;
}

/** 统一响应包装（后端 { code, message, data }） */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const STATUS_LABEL: Record<number, string> = {
  1: '草稿',
  2: '审核中',
  3: '已发布',
  4: '已下线',
};
