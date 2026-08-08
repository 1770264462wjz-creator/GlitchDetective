import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ErrorCode } from '../../common/constants/error-code';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('Analytics API (e2e)', () => {
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
      .send({ code: `evt_${Math.random().toString(36).slice(2, 8)}`, platform: 'douyin' })
      .expect(201);
    return res.body.data.token;
  }

  it('匿名上报白名单事件成功', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        events: [
          { event_id: 'anon-launch-1', event_name: 'app_launch', ts: '2026-08-08T10:00:00.000Z' },
        ],
      })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual({ accepted: 1, dropped: 0 });
  });

  it('匿名上报非白名单事件返回 2001', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        events: [
          { event_id: 'anon-level-1', event_name: 'level_start', ts: '2026-08-08T10:00:00.000Z' },
        ],
      })
      .expect(401);
    expect(res.body.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('登录后上报关卡事件成功（带 app_version/platform 头）', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .set('app_version', '1.0.0')
      .set('platform', 'douyin')
      .send({
        events: [
          {
            event_id: 'login-level-1',
            event_name: 'level_finish',
            properties: { level_id: '1', stars: 3, time_ms: 12000 },
            ts: '2026-08-08T10:01:00.000Z',
          },
        ],
      })
      .expect(201);
    expect(res.body.data).toEqual({ accepted: 1, dropped: 0 });
  });

  it('幂等：相同 event_id 重复上报计 dropped', async () => {
    const token = await login();
    const payload = {
      events: [
        { event_id: 'dup-event-1', event_name: 'level_start', ts: '2026-08-08T10:02:00.000Z' },
      ],
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(first.body.data).toEqual({ accepted: 1, dropped: 0 });
    const second = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(second.body.data).toEqual({ accepted: 0, dropped: 1 });
  });

  it('非法事件名返回 1001', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        events: [
          { event_id: 'bad-name-1', event_name: 'not_real', ts: '2026-08-08T10:00:00.000Z' },
        ],
      })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });

  it('单批 51 条返回 1001', async () => {
    const token = await login();
    const events = Array.from({ length: 51 }, (_, i) => ({
      event_id: `many-${i}`,
      event_name: 'level_start',
      ts: '2026-08-08T10:00:00.000Z',
    }));
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ events })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });
});
