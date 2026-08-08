import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ErrorCode } from '../../common/constants/error-code';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('Auth & User API (e2e)', () => {
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

  it('POST /api/v1/auth/login 匿名登录成功', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ code: 'e2e_code_1', platform: 'douyin' })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.is_new).toBe(true);
    expect(res.body.data.user.user_id).toMatch(/^gd_u_\d+$/);
    expect(res.body.data.user.platform).toBe('douyin');
  });

  it('登录后携带 token 访问 GET /user/profile 成功', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ code: 'e2e_code_2', nickname: '测试玩家', platform: 'douyin' })
      .expect(201);
    const token = login.body.data.token;

    const res = await request(app.getHttpServer())
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.user.nickname).toBe('测试玩家');
    expect(res.body.data.stats).toMatchObject({
      max_level: 1,
      finished_count: 0,
      stars_total: 0,
    });
    expect(res.body.data.equipped_skin).toBeNull();
  });

  it('登录后上报进度，profile 统计随之更新', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ code: 'e2e_code_3', platform: 'douyin' })
      .expect(201);
    const token = login.body.data.token;

    await request(app.getHttpServer())
      .post('/api/v1/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({
        level_id: '1',
        stars: 3,
        time_ms: 12000,
        finished: true,
        hint_used: 0,
        client_version: '1.0.0',
      })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body.data.stats).toMatchObject({
      max_level: 2,
      finished_count: 1,
      stars_total: 3,
    });
  });

  it('未携带 token 访问受保护接口返回 2001', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/user/profile')
      .expect(401);
    expect(res.body.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('携带伪造 token 返回 2003', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer fake.token.value')
      .expect(401);
    expect(res.body.code).toBe(ErrorCode.TOKEN_INVALID);
  });

  it('登录缺 code 参数返回 1001', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ platform: 'douyin' })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });
});
