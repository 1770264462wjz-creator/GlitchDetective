import { LevelContentDef, LevelObjectDef } from './LevelTypes';
import { ParsedLevel } from './LevelParser';

/**
 * 场景构建器：按 scene.objects 构建运行时节点树。
 * 职责：为每个物件生成"可交互对象"（含判定回调注册位），供 Binder 绑定交互。
 * 渲染层适配：Cocos 挂载后由具体渲染器（Sprite/Label）实现 buildNode。
 */

/** 运行时物件节点（渲染无关的抽象，Cocos 侧再映射为 cc.Node） */
export interface RuntimeObjectNode {
  def: LevelObjectDef;
  /** 渲染对象句柄（Cocos 侧为 cc.Node / UI 组件） */
  handle: unknown;
  visible: boolean;
  locked: boolean;
  state: string;
  /** 绑定回调：由 Binder 注入（trigger, actionId）→ void */
  onInteract: ((trigger: string, actionId: string) => void) | null;
}

export class SceneBuilder {
  private readonly nodes: RuntimeObjectNode[] = [];

  constructor(
    private readonly parsed: ParsedLevel,
    private readonly renderer: {
      buildNode(obj: LevelObjectDef): unknown;
      showNode(node: RuntimeObjectNode): void;
      hideNode(node: RuntimeObjectNode): void;
    },
  ) {}

  build(): RuntimeObjectNode[] {
    this.nodes.length = 0;
    const { content } = this.parsed;

    for (const obj of content.scene.objects) {
      const node: RuntimeObjectNode = {
        def: obj,
        handle: this.renderer.buildNode(obj),
        visible: obj.visible ?? true,
        locked: obj.locked ?? false,
        state: '',
        onInteract: null,
      };
      node.visible ? this.renderer.showNode(node) : this.renderer.hideNode(node);
      this.nodes.push(node);
    }
    return this.nodes;
  }

  /** 按 id 查节点 */
  findNode(id: string): RuntimeObjectNode | undefined {
    return this.nodes.find((n) => n.def.id === id);
  }

  /** 按 id 集合显示/隐藏 */
  applyVisibility(nodeIds: string[], visible: boolean): void {
    for (const id of nodeIds) {
      const node = this.findNode(id);
      if (!node) continue;
      node.visible = visible;
      visible ? this.renderer.showNode(node) : this.renderer.hideNode(node);
    }
  }

  /** 应用 onSuccess.setState（state 仅记录，渲染层可监听变化） */
  applyState(objectId: string, state: string): void {
    const node = this.findNode(objectId);
    if (node) node.state = state;
  }
}

export type { LevelContentDef };
