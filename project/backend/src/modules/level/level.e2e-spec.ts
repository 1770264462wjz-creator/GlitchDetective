import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ErrorCode } from '../../common/constants/error-code';

describe('Level API (e2e)', () => {
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/levels 返回关卡列表', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels').expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.list).toHaveLength(3);
    expect(res.body.data.list[0]).toMatchObject({
      level_id: '1',
      level_no: 1,
      chapter_id: 1,
      puzzle_type: 'visual',
      reward_stars: 3,
      unlocked: true,
      stars: 0,
      best_time_ms: null,
    });
  });

  it('GET /api/v1/levels 支持 puzzle_type / chapter_id / 分页过滤', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/levels?puzzle_type=target&chapter_id=2&page=1&page_size=10')
      .expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list[0].puzzle_type).toBe('target');
  });

  it('GET /api/v1/levels 分页 has_more', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/levels?page=1&page_size=2')
      .expect(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.has_more).toBe(true);
  });

  it('GET /api/v1/levels/:id 返回关卡详情', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels/3').expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.level_id).toBe('3');
    expect(res.body.data.content.puzzleType).toBe('target');
    expect(res.body.data.hint_ids).toHaveLength(3);
    expect(res.body.data.content).toHaveProperty('truthLayer');
    expect(res.body.data.content).toHaveProperty('misleadLayer');
    expect(res.body.data.content).toHaveProperty('hints');
  });

  it('GET /api/v1/levels/:id 不存在返回 1003/404', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels/999').expect(404);
    expect(res.body.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(res.body.data).toBeNull();
  });

  it('GET /api/v1/levels/:id 非法参数返回 1001/400', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels/abc').expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });

  it('GET /api/v1/levels 非法分页参数返回 1001/400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/levels?page=0&page_size=999')
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });
});
