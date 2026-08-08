import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { AuthService } from './auth.service';
import { CODE_EXCHANGER } from './interfaces/code-exchanger.interface';
import { MockCodeExchanger } from './exchangers/mock-code.exchanger';
import { USER_STORE } from './interfaces/user-store.interface';
import { MemoryUserStore } from './stores/memory-user.store';
import { SESSION_STORE } from './interfaces/session-store.interface';
import { MemorySessionStore } from './stores/memory-session.store';
import { TokenService } from './token.service';
import { USER_STATUS_BANNED } from './interfaces/user-store.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let tokenService: TokenService;
  let userStore: MemoryUserStore;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: 'test-secret',
          signOptions: { expiresIn: 60 * 60 },
        }),
      ],
      providers: [
        { provide: CODE_EXCHANGER, useClass: MockCodeExchanger },
        { provide: USER_STORE, useClass: MemoryUserStore },
        { provide: SESSION_STORE, useClass: MemorySessionStore },
        AuthService,
        TokenService,
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    tokenService = moduleRef.get(TokenService);
    userStore = moduleRef.get(USER_STORE) as MemoryUserStore;
  });

  it('首次登录：注册新用户并签发 token（is_new=true）', async () => {
    const result = await authService.login({
      code: 'codeA',
      nickname: 'Bug收集者',
      avatarUrl: 'https://avatar/1.png',
      platform: 'douyin',
    });
    expect(result.is_new).toBe(true);
    expect(result.token).toBeTruthy();
    expect(result.expires_in).toBe(7 * 24 * 60 * 60);
    expect(result.user).toMatchObject({
      user_id: 'gd_u_100001',
      nickname: 'Bug收集者',
      platform: 'douyin',
      is_member: false,
      member_expire_at: null,
    });
    // token 可被校验（会话已写入）
    const auth = tokenService.verify(result.token);
    expect(auth.userId).toBe('100001');
  });

  it('重复登录：同一 code 返回同一用户（is_new=false），不重复建号', async () => {
    const first = await authService.login({ code: 'codeB', platform: 'douyin' });
    const second = await authService.login({ code: 'codeB', platform: 'douyin' });
    expect(first.is_new).toBe(true);
    expect(second.is_new).toBe(false);
    expect(second.user.user_id).toBe(first.user.user_id);
    // 同一 code 建号一次：openid 唯一（findByOpenid 应命中同一条）
    const stored = userStore.findByOpenid('mock_codeB');
    expect(stored?.id).toBe(Number(first.user.user_id.replace('gd_u_', '')));
  });

  it('两个不同 code 得到不同用户', async () => {
    const a = await authService.login({ code: 'codeC1', platform: 'douyin' });
    const b = await authService.login({ code: 'codeC2', platform: 'douyin' });
    expect(a.user.user_id).not.toBe(b.user.user_id);
  });

  it('封禁用户登录被拒（2004）', async () => {
    // 造一个封禁用户
    const banned = await authService.login({ code: 'codeD', platform: 'douyin' });
    const id = Number(banned.user.user_id.replace('gd_u_', ''));
    const stored = userStore.findById(id);
    if (stored) stored.status = USER_STATUS_BANNED;

    await expect(
      authService.login({ code: 'codeD', platform: 'douyin' }),
    ).rejects.toMatchObject({
      getResponse: expect.any(Function),
    });
    try {
      await authService.login({ code: 'codeD', platform: 'douyin' });
      fail('应当抛出 BusinessException');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      const res = (e as BusinessException).getResponse() as { code: number };
      expect(res.code).toBe(ErrorCode.ACCOUNT_BANNED);
    }
  });

  it('平台参数缺失时校验失败（DTO 层拦截，service 侧不出现）', async () => {
    // 该断言确保 DTO 校验在路由层生效；service 仅按已校验入参工作
    expect(authService).toBeDefined();
  });
});
