import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ErrorCode } from '../../common/constants/error-code';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('Ad API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalGuards(app.get(JwtAuthGuard));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ code: `ad_${Math.random().toString(36).slice(2, 8)}`, platform: 'douyin' })
      .expect(201);
    return res.body.data.token;
  }

  it('未登录访问广告接口返回 2001', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ad/start')
      .send({ ad_type: 'hint', scene: 'level', level_id: '1' })
      .expect(401);
    expect(res.body.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('完整链路：start → verify（double）→ reward-claim 补偿领取', async () => {
    const token = await login();

    // start
    const start = await request(app.getHttpServer())
      .post('/api/v1/ad/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ ad_type: 'double', scene: 'settle', level_id: '1' })
      .expect(201);
    expect(start.body.data.ad_token).toMatch(/^ad_/);
    const adToken = start.body.data.ad_token;

    // verify（dyad_ 前缀视为合法）
    const orderId = `dyad_e2e_${Date.now()}`;
    const verify = await request(app.getHttpServer())
      .post('/api/v1/ad/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_token: adToken,
        ad_type: 'double',
        scene: 'settle',
        level_id: '1',
        platform_order_id: orderId,
        ad_unit_id: 'adunit_double_01',
      })
      .expect(201);
    expect(verify.body.data.rewarded).toBe(true);
    expect(verify.body.data.reward.type).toBe('double_stars');

    // reward-claim 补偿领取（模拟响应丢失后重试）
    const claim = await request(app.getHttpServer())
      .post('/api/v1/ad/reward-claim')
      .set('Authorization', `Bearer ${token}`)
      .send({ platform_order_id: orderId })
      .expect(201);
    expect(claim.body.data.claimed).toBe(true);
    expect(claim.body.data.reward.platform_order_id).toBe(orderId);
  });

  it('伪造凭证 verify 被拒（4021）', async () => {
    const token = await login();
    const start = await request(app.getHttpServer())
      .post('/api/v1/ad/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ ad_type: 'hint', scene: 'level', level_id: '1' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/ad/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_token: start.body.data.ad_token,
        ad_type: 'hint',
        scene: 'level',
        level_id: '1',
        platform_order_id: 'fake_order_e2e',
        ad_unit_id: 'adunit_hint_01',
      })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.AD_TOKEN_INVALID);
  });

  it('verify 幂等：相同 platform_order_id 重复调用返回既有结果', async () => {
    const token = await login();
    const start = await request(app.getHttpServer())
      .post('/api/v1/ad/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ ad_type: 'clue', scene: 'level', level_id: '1' })
      .expect(201);

    const orderId = `dyad_e2e_idem_${Date.now()}`;
    const payload = {
      ad_token: start.body.data.ad_token,
      ad_type: 'clue',
      scene: 'level',
      level_id: '1',
      platform_order_id: orderId,
      ad_unit_id: 'adunit_clue_01',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/ad/verify')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(first.body.data.rewarded).toBe(true);
    const second = await request(app.getHttpServer())
      .post('/api/v1/ad/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, ad_token: 'ad_stale_token' }) // 幂等优先于会话校验
      .expect(201);
    expect(second.body.data.reward.platform_order_id).toBe(orderId);
  });

  it('hint 缺 level_id 返回 1001', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/v1/ad/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ ad_type: 'hint', scene: 'level' })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });
});
