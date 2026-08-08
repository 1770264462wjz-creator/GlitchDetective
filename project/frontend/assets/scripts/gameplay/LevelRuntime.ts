import { LevelParser, ParsedLevel } from '../interpreter/LevelParser';
import { SceneBuilder } from '../interpreter/SceneBuilder';
import { Binder } from '../interpreter/Binder';
import { Judge, JudgeEvent } from '../interpreter/Judge';

/**
 * 单关运行时：组合 解析器 → 构建器 → 绑定器 → 判定器。
 * 对外暴露：
 * - load(content)：装载关卡
 * - onEvent(listener)：监听 wrong/right/win/info
 * - interact(node, trigger)：渲染层交互入口
 * - getState()：当前状态（错误次数/是否通关）
 */

export interface LevelRuntimeState {
  won: boolean;
  wrongCount: number;
}

export class LevelRuntime {
  private parser!: ParsedLevel;
  private builder!: SceneBuilder;
  private binder!: Binder;
  private judge!: Judge;
  private loaded = false;

  constructor(
    private readonly renderer: {
      buildNode(def: { id: string; type: string; position: { x: number; y: number } }): unknown;
      showNode(node: unknown): void;
      hideNode(node: unknown): void;
    },
  ) {}

  /** 装载后端下发的关卡 content（JSON） */
  load(content: unknown): void {
    this.parser = LevelParser.parse(content);
    this.builder = new SceneBuilder(this.parser, {
      buildNode: (obj) => this.renderer.buildNode(obj),
      showNode: (node) => this.renderer.showNode(node.handle),
      hideNode: (node) => this.renderer.hideNode(node.handle),
    });
    this.builder.build();
    this.judge = new Judge(this.parser, this.builder);
    this.binder = new Binder(this.parser, this.builder);
    this.loaded = true;
  }

  bind(): void {
    if (!this.loaded) throw new Error('运行时未装载关卡');
    this.binder.bind((node, action) => {
      this.judge.judge(node, action);
    });
  }

  onEvent(listener: (e: JudgeEvent) => void): void {
    this.judge.onEvent(listener);
  }

  /** 渲染层交互入口（由具体渲染器调用） */
  interact(nodeId: string, trigger: 'tap' | 'doubleTap' | 'longPress' | 'drag' | 'combine'): void {
    if (!this.loaded) return;
    const node = this.builder.findNode(nodeId);
    if (node) this.binder.emitInteract(node, trigger);
  }

  getState(): LevelRuntimeState {
    return {
      won: this.judge['won'] === true,
      wrongCount: this.judge.wrongCountValue,
    };
  }
}
