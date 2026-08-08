import { _decorator, Component, Node, Sprite, Label, UITransform, Vec3, Color, find } from 'cc';
import { LevelObjectDef, TriggerType } from '../interpreter/LevelTypes';
import { LevelRuntime } from '../gameplay/LevelRuntime';
import { LevelRepo } from '../data/LevelRepo';
import { RuntimeObjectNode } from '../interpreter/SceneBuilder';

const { ccclass, property } = _decorator;

/**
 * Cocos Creator 3.8 场景挂载组件（LevelScene）。
 * 用法：把本脚本挂到 Level.scene 的根节点上，设置 levelId 与 baseUrl 后运行。
 * 职责：渲染器适配（Sprite/Label 构建）+ 交互入口（点击/拖拽）→ 解释器运行时。
 *
 * 依赖：解释器脚本需与组件同工程（assets/scripts/interpreter / gameplay / data）。
 */
@ccclass('LevelScene')
export class LevelScene extends Component {
  /** 后端服务地址（默认本机 2010，打包抖音后改为线上域名） */
  @property
  baseUrl = 'http://localhost:2010/api/v1';

  /** 要试玩的关卡 ID（1=关掉的灯还亮着） */
  @property
  levelId = '1';

  /** 登录 token（本地联调可留空，会自动 Mock 登录） */
  @property
  token = '';

  private runtime!: LevelRuntime;
  private repo!: LevelRepo;
  private nodes: Map<string, Node> = new Map();
  private interactables: Map<string, { def: LevelObjectDef; node: Node }> = new Map();

  onLoad(): void {
    this.repo = new LevelRepo(this.baseUrl);
    this.runtime = new LevelRuntime({
      buildNode: (def) => this.buildNode(def),
      showNode: (node) => this.showNode(node as RuntimeObjectNode),
      hideNode: (node) => this.hideNode(node as RuntimeObjectNode),
    });
  }

  async start(): Promise<void> {
    // 1. 未配置 token 时自动 Mock 登录（本地联调用）
    if (!this.token) {
      try {
        const res = await fetch(`${this.baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'dev_code_cocos', platform: 'douyin' }),
        });
        const body = await res.json();
        if (body.code === 0) this.token = body.data.token;
      } catch (e) {
        console.warn('[LevelScene] 自动登录失败，尝试匿名拉取', e);
      }
    }
    this.repo.setToken(this.token || null);

    // 2. 拉取关卡内容
    let detail;
    try {
      detail = await this.repo.detail(this.levelId);
    } catch (e) {
      console.error('[LevelScene] 拉取关卡失败（后端未启动？）', e);
      this.showToast('后端连接失败，请确认 2010 已启动');
      return;
    }

    // 3. 装载解释器 + 绑定交互 + 监听事件
    this.runtime.load(detail.content);
    this.runtime.bind();
    this.runtime.onEvent((e) => {
      if (e.type === 'wrong') {
        this.showToast(e.action.feedback?.toast ?? '再想想');
        console.log(`[Bug哥] ${e.action.feedback?.bugTalk ?? '不对哦'}（错误 ${this.runtime.getState().wrongCount} 次）`);
      } else if (e.type === 'right') {
        this.showToast(e.action.feedback?.toast ?? '有进展！');
      } else if (e.type === 'win') {
        console.log(`[通关] ${e.action.feedback?.bugTalk ?? '真相只有一个！'}`);
        this.showToast('🎉 ' + (e.action.feedback?.bugTalk ?? '通关！'));
      }
    });

    console.log(`[LevelScene] 关卡「${detail.title}」装载完成`);
  }

  /** 渲染器：按物件定义构建节点（Sprite 白色占位 / Label 文本） */
  private buildNode(def: LevelObjectDef): Node {
    const node = new Node(def.id);
    this.node.addChild(node);
    node.setPosition(new Vec3(def.position.x, def.position.y, 0));
    node.setSiblingIndex(def.zIndex ?? 0);

    const ui = node.addComponent(UITransform);

    if (def.type === 'label' || def.text != null) {
      ui.setContentSize(240, 60);
      const label = node.addComponent(Label);
      label.string = def.text ?? def.id;
      label.fontSize = 28;
      label.color = new Color(40, 40, 40, 255);
      label.lineHeight = 32;
    } else {
      ui.setContentSize(120, 120);
      const sprite = node.addComponent(Sprite);
      // 白色占位（资源就位后按 spriteKey 替换图集，docs/05 资源约定）
      sprite.color = new Color(120, 160, 255, 255);
    }

    if (def.interactive) {
      this.interactables.set(def.id, { def, node });
      node.on(Node.EventType.TOUCH_END, () => {
        this.runtime.interact(def.id, 'tap' as TriggerType);
      });
    }

    this.nodes.set(def.id, node);
    return node;
  }

  private showNode(node: RuntimeObjectNode): void {
    const n = this.nodes.get(node.def.id);
    if (n) n.active = true;
  }

  private hideNode(node: RuntimeObjectNode): void {
    const n = this.nodes.get(node.def.id);
    if (n) n.active = false;
  }

  private showToast(text: string): void {
    // 场景中创建名为 ToastLabel 的 Label 节点即可显示；无则仅 console
    const toast = find('Canvas/ToastLabel');
    if (toast) {
      const label = toast.getComponent(Label);
      if (label) label.string = text;
    }
    console.log(`[Toast] ${text}`);
  }
}
