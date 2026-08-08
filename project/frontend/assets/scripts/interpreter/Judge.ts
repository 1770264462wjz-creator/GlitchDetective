import { LevelActionDef } from './LevelTypes';
import { ParsedLevel } from './LevelParser';
import { RuntimeObjectNode, SceneBuilder } from './SceneBuilder';

/**
 * 动作判定器（Judge）：对玩家的交互动作做结果判定并执行效果。
 * 规则（docs/04）：
 * - result=wrong：触发误导反馈（Bug 哥台词/计数），不推进
 * - result=right：按 truthLayer.successMode 判定是否通关
 *   - any：任一 right 即通关
 *   - sequence：须按 truthLayer.actions 顺序命中
 *   - combo：须连续命中（中途 wrong 重置）
 * - onSuccess 效果：setState / showObject / hideObject / gotoResult
 */

export interface JudgeEvent {
  type: 'wrong' | 'right' | 'win' | 'info';
  action: LevelActionDef;
  node: RuntimeObjectNode;
}

export class Judge {
  private wrongCount = 0;
  private sequenceIndex = 0;
  private comboStreak = 0;
  private won = false;
  private listeners: ((e: JudgeEvent) => void)[] = [];

  constructor(
    private readonly parsed: ParsedLevel,
    private readonly builder: SceneBuilder,
  ) {}

  onEvent(listener: (e: JudgeEvent) => void): void {
    this.listeners.push(listener);
  }

  /** 判定一次交互；返回是否通关 */
  judge(node: RuntimeObjectNode, action: LevelActionDef): boolean {
    if (this.won) return true;

    const { truthLayer, misleadLayer } = this.parsed.content;

    if (action.result === 'right' && truthLayer.actions.includes(action)) {
      return this.handleRight(node, action);
    }
    if (action.result === 'wrong' && misleadLayer.actions.includes(action)) {
      this.wrongCount++;
      this.comboStreak = 0;
      this.emit({ type: 'wrong', action, node });
      return false;
    }
    // info 动作：仅提示
    this.emit({ type: 'info', action, node });
    return false;
  }

  private handleRight(node: RuntimeObjectNode, action: LevelActionDef): boolean {
    const mode = this.parsed.content.truthLayer.successMode ?? 'any';

    let reached = false;
    switch (mode) {
      case 'sequence': {
        const ordered = this.parsed.content.truthLayer.actions.filter((a) => a.result === 'right');
        reached = ordered[this.sequenceIndex]?.id === action.id;
        this.sequenceIndex = reached ? this.sequenceIndex + 1 : 0;
        break;
      }
      case 'combo': {
        this.comboStreak++;
        const ordered = this.parsed.content.truthLayer.actions.filter((a) => a.result === 'right');
        reached = this.comboStreak >= ordered.length;
        break;
      }
      default:
        reached = true;
    }

    if (!reached) {
      this.emit({ type: 'right', action, node });
      return false;
    }

    // 通关：执行 onSuccess 效果
    this.applyOnSuccess(action);
    this.won = true;
    this.emit({ type: 'win', action, node });
    return true;
  }

  private applyOnSuccess(action: LevelActionDef): void {
    const on = action.onSuccess;
    if (!on) return;
    if (on.setState) {
      for (const [objectId, state] of Object.entries(on.setState)) {
        this.builder.applyState(objectId, state);
      }
    }
    if (on.showObject?.length) this.builder.applyVisibility(on.showObject, true);
    if (on.hideObject?.length) this.builder.applyVisibility(on.hideObject, false);
    // gotoResult 由外层监听 win 事件处理（跳结算）
  }

  get wrongCountValue(): number {
    return this.wrongCount;
  }

  reset(): void {
    this.wrongCount = 0;
    this.sequenceIndex = 0;
    this.comboStreak = 0;
    this.won = false;
  }

  private emit(e: JudgeEvent): void {
    for (const l of this.listeners) l(e);
  }
}
