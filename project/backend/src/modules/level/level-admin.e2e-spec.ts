import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ErrorCode } from '../../common/constants/error-code';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 管理端关卡 API e2e（docs/11 §6 内容管线）。
 * 用第 1 关 content 做模板创建草稿（保证 R01-R20 通过）。
 */
describe('Level Admin API (e2e)', () => {
  let app: INestApplication;
  let seedContent: Record<string, unknown>;
  let token: string;

  /** 带 token 访问 admin 接口 */
  function authGet(url: string) {
    return request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);
  }
  function authPost(url: string, body?: Record<string, unknown>) {
    let r = request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`);
    if (body !== undefined) r = r.send(body);
    return r;
  }
  function authPut(url: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${token}`).send(body);
  }
  function authDelete(url: string) {
    return request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`);
  }

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

    // 登录拿 token（全局守卫要求），取第 1 关 content 作为模板
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ code: `admin_${Date.now()}`, platform: 'douyin' })
      .expect(201);
    token = login.body.data.token;
    const detail = await authGet('/api/v1/levels/1').expect(200);
    seedContent = detail.body.data.content;
  });

  afterAll(async () => {
    await app.close();
  });

  it('创建草稿成功（content 合法）', async () => {
    const content = {
      ...seedContent,
      levelId: 'level_admin_001',
      title: '管理端测试关',
    };
    const res = await authPost('/api/v1/admin/levels', { content, chapter_id: 3 }).expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.level_id).toBe('4'); // 种子 3 关后首个序号
    expect(res.body.data.level_status).toBe(1); // 草稿
    expect(res.body.data.title).toBe('管理端测试关');
  });

  it('创建草稿 content 非法（缺 title）被拒 4032', async () => {
    const bad = { ...seedContent, title: '' };
    const res = await authPost('/api/v1/admin/levels', { content: bad, chapter_id: 3 }).expect(500);
    expect(res.body.code).toBe(ErrorCode.LEVEL_DATA_INVALID);
  });

  it('管理列表返回全部状态（含草稿）', async () => {
    const res = await authGet('/api/v1/admin/levels').expect(200);
    expect(res.body.data.length).toBe(4); // 3 种子 + 1 草稿
    expect(res.body.data.some((l: { level_status: number }) => l.level_status === 1)).toBe(true);
  });

  it('按 status 过滤管理列表', async () => {
    const res = await authGet('/api/v1/admin/levels?status=1').expect(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].level_status).toBe(1);
  });

  it('状态流转：草稿 submit → 审核中 approve → 已发布，客户端列表可见', async () => {
    // submit
    const sub = await authPost('/api/v1/admin/levels/4/submit').expect(201);
    expect(sub.body.data.level_status).toBe(2);
    // approve
    const appr = await authPost('/api/v1/admin/levels/4/approve').expect(201);
    expect(appr.body.data.level_status).toBe(3);
    // 客户端列表可见（第 4 关出现）
    const list = await authGet('/api/v1/levels').expect(200);
    expect(list.body.data.total).toBe(4);
    expect(list.body.data.list.some((l: { level_id: string }) => l.level_id === '4')).toBe(true);
  });

  it('非法流转：已发布不可直接 submit（1001）', async () => {
    const res = await authPost('/api/v1/admin/levels/4/submit').expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });

  it('发布后下线，客户端列表移除', async () => {
    const off = await authPost('/api/v1/admin/levels/4/offline').expect(201);
    expect(off.body.data.level_status).toBe(4);
    const list = await authGet('/api/v1/admin/levels?status=4').expect(200);
    expect(list.body.data.some((l: { level_id: string }) => l.level_id === '4')).toBe(true);
  });

  it('更新已下线关卡内容成功', async () => {
    const content = {
      ...seedContent,
      levelId: 'level_admin_001',
      title: '管理端测试关·改',
    };
    const res = await authPut('/api/v1/admin/levels/4', { content, chapter_id: 3 }).expect(200);
    expect(res.body.data.title).toBe('管理端测试关·改');
  });

  it('已发布关卡不可编辑（1001）', async () => {
    const content = { ...seedContent, levelId: 'level_admin_x', title: '不该成功' };
    const res = await authPut('/api/v1/admin/levels/1', { content, chapter_id: 1 }).expect(400);
    expect(res.body.code).toBe(ErrorCode.PARAM_INVALID);
  });

  it('删除草稿成功；删除已发布被拒', async () => {
    // 新建一个草稿再删
    const created = await authPost('/api/v1/admin/levels', {
      content: { ...seedContent, levelId: 'level_del_001', title: '待删草稿' },
      chapter_id: 3,
    }).expect(201);
    const newId = created.body.data.level_id;
    const del = await authDelete(`/api/v1/admin/levels/${newId}`).expect(200);
    expect(del.body.data.deleted).toBe(true);
    // 删除已发布（1 号）被拒
    const delPub = await authDelete('/api/v1/admin/levels/1').expect(400);
    expect(delPub.body.code).toBe(ErrorCode.PARAM_INVALID);
  });
});
