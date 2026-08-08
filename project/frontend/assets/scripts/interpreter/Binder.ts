import { LevelActionDef, TriggerType } from './LevelTypes';
import { ParsedLevel } from './LevelParser';
import { RuntimeObjectNode, SceneBuilder } from './SceneBuilder';

/**
 * 交互绑定器：把 scene.objects 的可交互物件与 actions 绑定。
 * 规则（docs/04）：
 * - interactive=true 且未 locked 的物件可交互
 * - 同一物件多个 action 时，按 trigger 区分（tap/doubleTap/longPress/drag/combine）
 * - 交互触发后回调 Judge 判定
 */

export class Binder {
  constructor(
    private readonly parsed: ParsedLevel,
    private readonly builder: SceneBuilder,
  ) {}

  /**
   * 为所有可交互物件绑定交互回调。
   * @param onAction 交互触发回调（judge 入口）：(node, action) => void
   */
  bind(onAction: (node: RuntimeObjectNode, action: LevelActionDef) => void): void {
    for (const node of this.builder['nodes'] as RuntimeObjectNode[]) {
      const obj = node.def;
      if (!obj.interactive) continue;

      node.onInteract = (trigger: string, _actionId: string) => {
        if (node.locked || !node.visible) return;

        // 按 trigger 匹配本物件对应的 action
        const matched = (obj.actions ?? []).find((a) => a.trigger === trigger);
        if (matched) {
          onAction(node, matched);
        }
      };
    }
  }

  /** 供渲染层调用：物件交互事件入口 */
  emitInteract(node: RuntimeObjectNode, trigger: TriggerType): void {
    node.onInteract?.(trigger, '');
  }

  setLocked(node: RuntimeObjectNode, locked: boolean): void {
    node.locked = locked;
  }
}
