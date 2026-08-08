import { LevelContentDef, LevelObjectDef, LevelActionDef } from './LevelTypes';

/**
 * 关卡内容解析器：把后端下发的 JSON(content) 转成运行时关卡模型。
 * 职责：字段兜底、基础结构校验、生成动作查找索引。
 * 不负责渲染与判定（由 SceneBuilder / Judge 消费）。
 */

export interface ParsedLevel {
  content: LevelContentDef;
  /** 物件索引：id → 定义 */
  objectById: Map<string, LevelObjectDef>;
  /** 动作索引：id → 定义 */
  actionById: Map<string, LevelActionDef>;
  /** 可交互物件列表 */
  interactiveObjects: LevelObjectDef[];
  /** 正确动作（truthLayer，result=right） */
  rightActions: LevelActionDef[];
  /** 误导动作（misleadLayer，result=wrong） */
  wrongActions: LevelActionDef[];
  /** 通关判定动作（onSuccess.gotoResult=true 的 right 动作） */
  winActions: LevelActionDef[];
}

export class LevelParser {
  /**
   * 解析关卡内容；结构不合法时抛出带原因的错误（防御脏数据）。
   */
  static parse(content: unknown): ParsedLevel {
    if (content == null || typeof content !== 'object') {
      throw new Error('关卡内容缺失或非对象');
    }
    const c = content as LevelContentDef;

    if (typeof c.title !== 'string' || c.title.length === 0) {
      throw new Error('关卡标题缺失');
    }
    if (!Array.isArray(c.scene?.objects)) {
      throw new Error('scene.objects 缺失');
    }
    if (!Array.isArray(c.truthLayer?.actions)) {
      throw new Error('truthLayer.actions 缺失');
    }

    const objectById = new Map<string, LevelObjectDef>();
    const actionById = new Map<string, LevelActionDef>();
    const interactiveObjects: LevelObjectDef[] = [];

    for (const obj of c.scene.objects) {
      objectById.set(obj.id, obj);
      if (obj.interactive) {
        interactiveObjects.push(obj);
        if (Array.isArray(obj.actions)) {
          for (const a of obj.actions) actionById.set(a.id, a);
        }
      }
    }
    for (const a of c.truthLayer.actions) actionById.set(a.id, a);
    for (const a of c.misleadLayer?.actions ?? []) actionById.set(a.id, a);

    const rightActions = c.truthLayer.actions.filter((a) => a.result === 'right');
    const wrongActions = (c.misleadLayer?.actions ?? []).filter((a) => a.result === 'wrong');
    const winActions = rightActions.filter((a) => a.onSuccess?.gotoResult === true);

    return {
      content: c,
      objectById,
      actionById,
      interactiveObjects,
      rightActions,
      wrongActions,
      winActions,
    };
  }
}
