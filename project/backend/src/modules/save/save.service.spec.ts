import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { MemoryLevelStore } from '../level/stores/memory-level.store';
import { LevelService } from '../level/level.service';
import { MemorySaveStore } from './stores/memory-save.store';
import { SaveService } from './save.service';
import type { ReportProgressInput } from './save.types';

/** 与 save.service 内 MIN_CLIENT_VERSION 一致的测试常量 */
const MIN_CLIENT_VERSION = '1.0.0';

describe('SaveService', () => {
  const levelStore = new MemoryLevelStore();
  levelStore.onModuleInit();
  const levelService = new LevelService(levelStore);
  const saveStore = new MemorySaveStore();
  const service = new SaveService(saveStore, levelService);

  /** 同一玩家、真实内存存储：用例按顺序依赖，构成一条完整推进链路 */
  const userId = 'u1';
  const base: Omit<ReportProgressInput, 'levelId'> = {
    stars: 3,
    timeMs: 10_000,
    finished: true,
    hintUsed: 0,
    bugUnlocked: false,
    clientVersion: MIN_CLIENT_VERSION,
  };

  function report(levelId: string, patch: Partial<ReportProgressInput> = {}) {
    return service.reportProgress(userId, { ...base, levelId, ...patch });
  }

  function expectBusinessCode(fn: () => unknown, code: number) {
    try {
      fn();
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(code);
    }
  }

  it('初始存档：第 1 关已解锁，3 项种子能力 1 级 0 经验，无 Bug 日志', () => {
    const data = service.getProgress(userId);
    expect(data.progress).toEqual(
      expect.objectContaining({
        current_level_id: '1',
        max_level: 1,
        stars_total: 0,
        finished_count: 0,
      }),
    );
    expect(data.skills).toHaveLength(3);
    expect(data.skills.every((s) => s.level === 1 && s.exp === 0)).toBe(true);
    expect(data.recent_bug_logs).toEqual([]);
  });

  it('版本闸门：低于最低支持版本拒绝（1004）', () => {
    expectBusinessCode(
      () => report('1', { clientVersion: '0.9.0' }),
      ErrorCode.CLIENT_VERSION_TOO_LOW,
    );
  });

  it('越级校验：第 1 关未通关时上报第 2 关被拒（4031）', () => {
    expectBusinessCode(
      () => report('2', { finished: false, stars: 1 }),
      ErrorCode.LEVEL_LOCKED,
    );
  });

  it('第 1 关 3 星通关：解锁第 2 关、累积 3 星、记录最快用时', () => {
    const result = report('1');
    expect(result.accepted).toBe(true);
    expect(result.best_updated).toBe(true);
    expect(result.progress).toEqual(
      expect.objectContaining({ max_level: 2, stars_total: 3, finished_count: 1 }),
    );
    expect(result.rewards.stars_gained).toBe(3);
    expect(result.rewards.bug_log_unlocked).toBeNull();
    const data = service.getProgress(userId);
    expect(data.progress.best_time_ms['1']).toBe(10_000);
  });

  it('重复上报更差成绩：接受但 best_updated=false，存档不变', () => {
    const result = report('1', { stars: 1, timeMs: 99_000 });
    expect(result.accepted).toBe(true);
    expect(result.best_updated).toBe(false);
    expect(result.progress.stars_total).toBe(3); // 不回退
    const data = service.getProgress(userId);
    expect(data.progress.best_time_ms['1']).toBe(10_000); // 保留最优用时
    expect(data.progress.finished_count).toBe(1);
  });

  it('重复上报更好成绩（更快用时）：best_time 刷新但星星不重复累计', () => {
    const result = report('1', { stars: 3, timeMs: 7_000 });
    expect(result.best_updated).toBe(true);
    const data = service.getProgress(userId);
    expect(data.progress.best_time_ms['1']).toBe(7_000);
    expect(data.progress.stars_total).toBe(3); // 同星级差值 0，不重复累计
    expect(data.progress.finished_count).toBe(1); // 不重复计数
  });

  it('通关第 2 关并领取 Bug：解锁该关 Bug002，进度推进到第 3 关', () => {
    const result = report('2', { bugUnlocked: true });
    expect(result.progress.max_level).toBe(3);
    expect(result.progress.stars_total).toBe(6);
    expect(result.rewards.bug_log_unlocked?.bug_no).toBe('Bug002');
    const data = service.getProgress(userId);
    expect(data.recent_bug_logs).toHaveLength(1);
    expect(data.recent_bug_logs[0].bug_no).toBe('Bug002');
    expect(data.progress.current_level_id).toBe('3'); // 已解锁范围内第一个未通关关
  });

  it('已解锁 Bug 重复上报：不再重复解锁（去重）', () => {
    const result = report('2', { bugUnlocked: true });
    expect(result.best_updated).toBe(false);
    const data = service.getProgress(userId);
    expect(data.recent_bug_logs).toHaveLength(1);
  });

  it('未通关上报（第 3 关，最高关）：被接受但不推进、不记录通关用时', () => {
    const result = report('3', { finished: false, stars: 1, timeMs: 5_000 });
    expect(result.accepted).toBe(true);
    expect(result.progress.max_level).toBe(3); // 不触发下一关解锁
    expect(result.progress.finished_count).toBe(2);
    const data = service.getProgress(userId);
    expect(data.progress.best_time_ms['3']).toBeUndefined(); // best_time 仅通关记录
  });

  it('关卡不存在返回 1003', () => {
    expectBusinessCode(() => report('999'), ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('存档按用户隔离：另一个玩家互不影响', () => {
    const other = service.getProgress('u2');
    expect(other.progress).toEqual(
      expect.objectContaining({ max_level: 1, stars_total: 0, finished_count: 0 }),
    );
    expect(other.recent_bug_logs).toEqual([]);
  });
});
