/**
 * 关卡内容 Schema v1 类型（与后端 docs/04 对齐）。
 * Cocos 客户端与编辑器共用同一份类型语义。
 */

export type PuzzleType = 'visual' | 'reverse' | 'target' | 'language' | 'detail';
export type TriggerType = 'tap' | 'doubleTap' | 'longPress' | 'drag' | 'combine';
export type ActionResultType = 'wrong' | 'right' | 'info';
export type SuccessMode = 'any' | 'sequence' | 'combo';
export type ObjectType = 'sprite' | 'label' | 'particle' | 'audio' | 'container';

export interface LevelObjectDef {
  id: string;
  type: ObjectType;
  spriteKey?: string;
  text?: string;
  position: { x: number; y: number };
  scale?: number;
  zIndex?: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  interactive: boolean;
  actions?: LevelActionDef[];
}

export interface LevelActionDef {
  id: string;
  trigger: TriggerType;
  targetId: string;
  payload?: { dragTo?: string; combineWith?: string };
  condition?: {
    type: 'state' | 'count' | 'time';
    objectId?: string;
    state?: string;
    actionId?: string;
    count?: number;
    minSeconds?: number;
  };
  result: ActionResultType;
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

export interface LevelHintDef {
  level: 1 | 2 | 3;
  text: string;
  bugTalk?: string;
  cost?: { ad?: boolean; coins?: number };
  cooldownSeconds?: number;
}

export interface LevelContentDef {
  schemaVersion: string;
  levelId: string;
  chapterId: string;
  order: number;
  title: string;
  puzzleType: PuzzleType;
  difficulty: number;
  unlock: { type: 'auto' } | { type: 'previous'; levelId: string };
  story: { intro: string; outro: string; introTalk?: string; outroTalk?: string };
  scene: {
    background: string;
    bgm?: string;
    objects: LevelObjectDef[];
    camera?: { initialZoom?: number; maxZoom?: number };
  };
  misleadLayer: { description: string; actions: LevelActionDef[] };
  truthLayer: { description: string; successMode: SuccessMode; actions: LevelActionDef[] };
  hints: LevelHintDef[];
  bugLog: { id: string; title: string; detail: string; reward?: { coins?: number; xp?: number } };
  tags?: string[];
}
