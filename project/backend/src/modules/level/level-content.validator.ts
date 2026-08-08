/**
 * 关卡内容 Schema v1 类型定义 + 校验器（docs/04 §9 规则 R01-R20）。
 * 校验器实现于后端（M2），规则编号与 docs/04 保持一致。
 */

export type PuzzleType = 'visual' | 'reverse' | 'target' | 'language' | 'detail';
export type TriggerType = 'tap' | 'doubleTap' | 'longPress' | 'drag' | 'combine';
export type ActionResultType = 'wrong' | 'right' | 'info';
export type SuccessMode = 'any' | 'sequence' | 'combo';
export type ObjectType = 'sprite' | 'label' | 'particle' | 'audio' | 'container';
export type ConditionType = 'state' | 'count' | 'time';

export interface LevelObject {
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
  initialState?: string;
  states?: Record<string, { spriteKey?: string; visible?: boolean }>;
  interactive: boolean;
  actions?: LevelAction[];
}

export interface LevelAction {
  id: string;
  trigger: TriggerType;
  targetId: string;
  payload?: { dragTo?: string; combineWith?: string };
  condition?: {
    type: ConditionType;
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

export interface LevelHint {
  level: 1 | 2 | 3;
  text: string;
  bugTalk?: string;
  cost?: { ad?: boolean; coins?: number };
  cooldownSeconds?: number;
}

export interface LevelContent {
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
    objects: LevelObject[];
    camera?: { initialZoom?: number; maxZoom?: number };
  };
  misleadLayer: { description: string; actions: LevelAction[] };
  truthLayer: { description: string; successMode: SuccessMode; actions: LevelAction[] };
  hints: LevelHint[];
  bugLog: { id: string; title: string; detail: string; reward?: { coins?: number; xp?: number } };
  tags?: string[];
}

export interface LevelValidationResult {
  valid: boolean;
  errors: string[];
}

const PUZZLE_TYPES: readonly string[] = ['visual', 'reverse', 'target', 'language', 'detail'];
const TRIGGERS: readonly string[] = ['tap', 'doubleTap', 'longPress', 'drag', 'combine'];
const RESULTS: readonly string[] = ['wrong', 'right', 'info'];
const SUCCESS_MODES: readonly string[] = ['any', 'sequence', 'combo'];

/** R09 难度段位：按全局序号推算 */
export function expectedDifficulty(globalNo: number): number {
  if (globalNo <= 20) return 2;
  if (globalNo <= 50) return 3;
  if (globalNo <= 80) return 4;
  return 5;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 校验关卡内容（R01-R20）。
 * @param content  待校验的关卡内容
 * @param globalNo 全局序号（第几关），用于 R09/R16 的一致性校验
 */
export function validateLevelContent(
  content: LevelContent,
  options?: { globalNo?: number },
): LevelValidationResult {
  const errors: string[] = [];
  const err = (rule: string, msg: string) => errors.push(`R${rule} ${msg}`);

  if (!isPlainObject(content)) {
    return { valid: false, errors: ['内容不是合法对象'] };
  }

  // --- R01 schemaVersion ---
  if (typeof content.schemaVersion !== 'string' || !/^1\.\d+\.\d+$/.test(content.schemaVersion)) {
    err('01', 'schemaVersion 必填且主版本必须为 1（格式 1.x.y）');
  }

  // --- R02 levelId ---
  if (typeof content.levelId !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(content.levelId)) {
    err('02', 'levelId 格式非法（^[A-Za-z][A-Za-z0-9_]{2,63}$）');
  }

  // --- R03 必填字段 ---
  if (typeof content.chapterId !== 'string' || !/^chapter_[0-9]{2}$/.test(content.chapterId)) {
    err('03', 'chapterId 格式非法（^chapter_[0-9]{2}$）');
  }
  if (!Number.isInteger(content.order) || content.order < 1) {
    err('03', 'order 必须为正整数');
  }
  if (typeof content.title !== 'string' || content.title.trim().length < 1 || content.title.length > 30) {
    err('03', 'title 必填，长度 1-30');
  }
  if (typeof content.puzzleType !== 'string' || !PUZZLE_TYPES.includes(content.puzzleType)) {
    err('03', `puzzleType 非法：${String(content.puzzleType)}`);
  }
  if (!Number.isInteger(content.difficulty)) {
    err('03', 'difficulty 必须为整数');
  }

  // --- R04 difficulty 1-5 ---
  if (!Number.isInteger(content.difficulty) || content.difficulty < 1 || content.difficulty > 5) {
    err('04', 'difficulty 必须为 1-5 的整数');
  }

  // --- R09 难度与全局序号段位匹配 ---
  if (options?.globalNo != null) {
    const expect = expectedDifficulty(options.globalNo);
    if (content.difficulty !== expect) {
      err('09', `第 ${options.globalNo} 关难度应为 ${expect}，实际 ${content.difficulty}`);
    }
  }

  // --- R06/R08 trigger / result / successMode 枚举 ---
  if (!isPlainObject(content.truthLayer) || typeof content.truthLayer.successMode !== 'string' ||
      !SUCCESS_MODES.includes(content.truthLayer.successMode)) {
    err('08', 'truthLayer.successMode 必须为 any/sequence/combo 之一');
  }

  // --- R10/R11/R12 物件与动作结构 ---
  const objects = content.scene?.objects;
  if (!Array.isArray(objects) || objects.length < 1) {
    err('10', 'scene.objects 至少 1 个');
  }

  const objectIds = new Set<string>();
  const allActions: LevelAction[] = [];
  const objectIndex = new Map<string, LevelObject>();

  if (Array.isArray(objects)) {
    objects.forEach((obj, i) => {
      if (!isPlainObject(obj)) return;
      if (typeof obj.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(obj.id)) {
        err('10', `objects[${i}].id 非法（^[a-z][a-z0-9_]*$）`);
      } else {
        if (objectIds.has(obj.id)) {
          err('10', `场景内物件 id 重复：${obj.id}`);
        }
        objectIds.add(obj.id);
        objectIndex.set(obj.id, obj);
      }
      if (obj.interactive === true) {
        if (!Array.isArray(obj.actions) || obj.actions.length < 1) {
          err('10', `interactive=true 的物件 ${obj.id} 必须配置 ≥1 个 action`);
        }
      } else if (obj.interactive === false) {
        if (Array.isArray(obj.actions) && obj.actions.length > 0) {
          err('10', `interactive=false 的物件 ${obj.id} 不得配置 action`);
        }
      }
      if (Array.isArray(obj.actions)) {
        allActions.push(...obj.actions);
      }
    });
  }

  // R12 action.id 全局唯一
  const actionIds = new Set<string>();
  allActions.forEach((a) => {
    if (typeof a?.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(a.id)) {
      err('12', `action.id 非法：${String(a?.id)}`);
    } else if (actionIds.has(a.id)) {
      err('12', `action.id 重复：${a.id}`);
    } else {
      actionIds.add(a.id);
    }
  });

  // --- R13 误导层/真相层动作结果约束 ---
  const misleadActions = content.misleadLayer?.actions;
  if (!Array.isArray(misleadActions) || misleadActions.length < 1) {
    err('13', 'misleadLayer.actions 至少 1 条');
  } else if (misleadActions.some((a) => a.result !== 'wrong')) {
    err('13', 'misleadLayer.actions 必须全部 result=wrong');
  }

  const truthActions = content.truthLayer?.actions;
  if (!Array.isArray(truthActions) || truthActions.length < 1) {
    err('13', 'truthLayer.actions 至少 1 条');
  } else if (truthActions.some((a) => a.result !== 'right')) {
    err('13', 'truthLayer.actions 必须全部 result=right');
  }

  // --- R14 同 (trigger, targetId, payload) 不得 wrong/right 并存 ---
  const ruleKey = (a: LevelAction) =>
    `${a.trigger}|${a.targetId}|${JSON.stringify(a.payload ?? null)}`;
  const wrongKeys = new Set<string>();
  const rightKeys = new Set<string>();
  allActions.forEach((a) => {
    if (a.result === 'wrong') wrongKeys.add(ruleKey(a));
    if (a.result === 'right') rightKeys.add(ruleKey(a));
  });
  rightKeys.forEach((k) => {
    if (wrongKeys.has(k)) {
      err('14', `同 (trigger, targetId, payload) 的 wrong 与 right 动作并存：${k}`);
    }
  });

  // --- R11 引用一致性 ---
  const checkRef = (what: string, id: unknown) => {
    if (typeof id === 'string' && id.length > 0 && !objectIds.has(id)) {
      err('11', `${what} 引用不存在的物件：${id}`);
    }
  };

  allActions.forEach((a) => {
    checkRef(`action ${a?.id} 的 targetId`, a?.targetId);
    const cond = a?.condition;
    if (cond?.type === 'state') {
      checkRef(`action ${a?.id} 的 condition.objectId`, cond.objectId);
    }
    if (cond?.type === 'count') {
      if (typeof cond.actionId !== 'string' || !actionIds.has(cond.actionId)) {
        err('20', `action ${a?.id} 的 count 条件引用的 actionId 不存在：${String(cond.actionId)}`);
      }
    }
    if (a?.payload?.dragTo) checkRef(`action ${a?.id} 的 payload.dragTo`, a.payload.dragTo);
    if (a?.payload?.combineWith) checkRef(`action ${a?.id} 的 payload.combineWith`, a.payload.combineWith);
    const onS = a?.onSuccess;
    if (onS?.setState) {
      Object.keys(onS.setState).forEach((oid) => checkRef(`action ${a?.id} 的 setState.${oid}`, oid));
    }
    (onS?.showObject ?? []).forEach((oid) => checkRef(`action ${a?.id} 的 showObject`, oid));
    (onS?.hideObject ?? []).forEach((oid) => checkRef(`action ${a?.id} 的 hideObject`, oid));
  });

  // --- R18 drag/combine 专属参数 ---
  allActions.forEach((a) => {
    if (a.trigger === 'drag' && typeof a.payload?.dragTo !== 'string') {
      err('18', `action ${a.id} trigger=drag 必须配置 payload.dragTo`);
    }
    if (a.trigger === 'combine' && typeof a.payload?.combineWith !== 'string') {
      err('18', `action ${a.id} trigger=combine 必须配置 payload.combineWith`);
    }
  });

  // --- R19 right 动作必须配置 bugTalk + gotoResult ---
  allActions
    .filter((a) => a.result === 'right')
    .forEach((a) => {
      if (typeof a.feedback?.bugTalk !== 'string' || a.feedback.bugTalk.trim().length < 1) {
        err('19', `right 动作 ${a.id} 必须配置 feedback.bugTalk`);
      }
      if (a.onSuccess?.gotoResult !== true) {
        err('19', `right 动作 ${a.id} 必须配置 onSuccess.gotoResult=true`);
      }
    });

  // --- R15 hints 3 档 {1,2,3}，level 1 无广告 ---
  const hints = content.hints;
  if (!Array.isArray(hints) || hints.length !== 3) {
    err('15', 'hints 必须恰为 3 档');
  } else {
    const levels = hints.map((h) => h?.level).sort();
    if (levels.join(',') !== '1,2,3') {
      err('15', `hints.level 必须为 {1,2,3} 且不重复，实际 [${levels.join(',')}]`);
    }
    const hint1 = hints.find((h) => h?.level === 1);
    if (hint1?.cost?.ad === true) {
      err('15', 'hints level 1 的 cost.ad 必须为 false');
    }
  }

  // --- R16 bugLog.id 与全局序号一致 ---
  if (!isPlainObject(content.bugLog) || typeof content.bugLog.id !== 'string' ||
      !/^Bug[0-9]{3,}$/.test(content.bugLog.id)) {
    err('16', 'bugLog.id 必填且匹配 ^Bug[0-9]{3,}$');
  } else if (options?.globalNo != null) {
    const num = Number(content.bugLog.id.replace('Bug', ''));
    if (num !== options.globalNo) {
      err('16', `bugLog.id 数值（${num}）须与全局序号（${options.globalNo}）一致`);
    }
  }

  // --- R17 文案字段去空白不得为空 ---
  const textFields: Array<{ scope: string; value: unknown }> = [
    { scope: 'title', value: content.title },
    { scope: 'story.intro', value: content.story?.intro },
    { scope: 'story.outro', value: content.story?.outro },
    { scope: 'story.introTalk', value: content.story?.introTalk },
    { scope: 'story.outroTalk', value: content.story?.outroTalk },
    { scope: 'bugLog.title', value: content.bugLog?.title },
    { scope: 'bugLog.detail', value: content.bugLog?.detail },
    { scope: 'misleadLayer.description', value: content.misleadLayer?.description },
    { scope: 'truthLayer.description', value: content.truthLayer?.description },
  ];
  objects?.forEach((obj) => {
    textFields.push({ scope: `objects.${obj.id}.text`, value: obj.text });
  });
  allActions.forEach((a) => {
    textFields.push({ scope: `action ${a.id} feedback.text`, value: a.feedback?.text });
    textFields.push({ scope: `action ${a.id} feedback.toast`, value: a.feedback?.toast });
    textFields.push({ scope: `action ${a.id} feedback.bugTalk`, value: a.feedback?.bugTalk });
  });
  hints?.forEach((h) => {
    textFields.push({ scope: `hint level ${h?.level} text`, value: h?.text });
    textFields.push({ scope: `hint level ${h?.level} bugTalk`, value: h?.bugTalk });
  });
  textFields.forEach(({ scope, value }) => {
    if (value != null && (typeof value !== 'string' || value.trim().length < 1)) {
      err('17', `文案字段 ${scope} 去空白后不得为空`);
    }
  });

  return { valid: errors.length === 0, errors };
}
