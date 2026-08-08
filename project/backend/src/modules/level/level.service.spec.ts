import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { MemoryLevelStore } from './stores/memory-level.store';
import { LevelService } from './level.service';
import { validateLevelContent } from './level-content.validator';

describe('MemoryLevelStore', () => {
  let store: MemoryLevelStore;

  beforeEach(() => {
    store = new MemoryLevelStore();
    store.onModuleInit(); // 复刻 Nest 启动时加载 + 校验
  });

  it('加载 3 个种子关卡且全局序号连续唯一', () => {
    const all = store.findAll();
    expect(all).toHaveLength(3);
    const nos = all.map((l) => l.globalNo).sort((a, b) => a - b);
    expect(nos).toEqual([1, 2, 3]);
    const orderSet = new Set(all.map((l) => l.order));
    expect(orderSet.size).toBe(3);
  });

  it('findByGlobalNo 命中 / 未命中', () => {
    expect(store.findByGlobalNo(2)?.globalNo).toBe(2);
    expect(store.findByGlobalNo(2)?.content.puzzleType).toBe('reverse');
    expect(store.findByGlobalNo(99)).toBeUndefined();
  });

  it('所有种子 content 通过 R01–R20 校验（启动即校验的保障）', () => {
    for (const level of store.findAll()) {
      const result = validateLevelContent(level.content, { globalNo: level.globalNo });
      // Jest 27+ 的 expect 不再接受第二个 message 参数，失败时通过 errors 断言输出细节
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('非法 content 确实会被校验拒绝（R 规则在起作用）', () => {
    const bad = { ...store.findByGlobalNo(1)!.content, title: '' };
    const result = validateLevelContent(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('LevelService', () => {
  const store = new MemoryLevelStore();
  store.onModuleInit();
  const service = new LevelService(store);

  it('list 默认分页返回全部 3 关', () => {
    const result = service.list({ page: 1, pageSize: 20 });
    expect(result.total).toBe(3);
    expect(result.list).toHaveLength(3);
    expect(result.has_more).toBe(false);
    const first = result.list[0];
    expect(first).toEqual(
      expect.objectContaining({
        level_id: '1',
        level_no: 1,
        chapter_id: 1,
        puzzle_type: 'visual',
        reward_stars: 3,
        unlocked: true,
        stars: 0,
      }),
    );
  });

  it('list 按 chapter_id 过滤', () => {
    const result = service.list({ page: 1, pageSize: 20, chapterId: 2 });
    // 第 2 章含 reverse（level_002）与 target（level_003）两关，按 globalNo 升序
    expect(result.total).toBe(2);
    expect(result.list[0].chapter_id).toBe(2);
    expect(result.list[0].puzzle_type).toBe('reverse');
    expect(result.list[1].puzzle_type).toBe('target');
  });

  it('list 按 puzzle_type 过滤', () => {
    const result = service.list({ page: 1, pageSize: 20, puzzleType: 'visual' });
    expect(result.total).toBe(1);
    expect(result.list[0].level_id).toBe('1');
  });

  it('list 分页与 has_more', () => {
    const page1 = service.list({ page: 1, pageSize: 2 });
    expect(page1.list).toHaveLength(2);
    expect(page1.has_more).toBe(true);
    const page2 = service.list({ page: 2, pageSize: 2 });
    expect(page2.list).toHaveLength(1);
    expect(page2.has_more).toBe(false);
    // 越界页返回空列表而非报错
    const page9 = service.list({ page: 9, pageSize: 2 });
    expect(page9.list).toHaveLength(0);
    expect(page9.total).toBe(3);
  });

  it('getDetail 返回完整关卡内容', () => {
    const detail = service.getDetail('2');
    expect(detail.level_id).toBe('2');
    expect(detail.hint_ids).toHaveLength(3);
    expect(detail.content.puzzleType).toBe('reverse');
    expect(detail.content.scene.objects.length).toBeGreaterThan(0);
  });

  it('getDetail 不存在返回 1003 业务异常', () => {
    try {
      service.getDetail('999');
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const code = (e as BusinessException).getResponse() as {
        code: number;
      };
      expect(code.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    }
  });
});
