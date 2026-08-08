import type { ApiResponse, LevelContent, LevelDetail, LevelSummary } from '../types/level';

const BASE = '/api/v1';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (body.code !== 0) {
    throw new Error(`${body.code}: ${body.message}`);
  }
  return body.data;
}

/** 管理端 API（docs/11 §6 内容管线） */
export const adminApi = {
  /** 管理列表（全部状态） */
  list: (status?: number) =>
    request<LevelSummary[]>(`/admin/levels${status != null ? `?status=${status}` : ''}`),

  /** 关卡详情（含 content） */
  detail: (id: string) => request<LevelDetail>(`/levels/${id}`),

  /** 创建草稿 */
  create: (content: LevelContent, chapterId: number) =>
    request<LevelSummary>('/admin/levels', {
      method: 'POST',
      body: JSON.stringify({ content, chapter_id: chapterId }),
    }),

  /** 更新关卡内容（草稿/已下线） */
  update: (id: string, content: LevelContent, chapterId?: number) =>
    request<LevelSummary>(`/admin/levels/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, chapter_id: chapterId }),
    }),

  /** 删除草稿 */
  remove: (id: string) =>
    request<{ deleted: boolean }>(`/admin/levels/${id}`, { method: 'DELETE' }),

  /** 状态流转：submit / reject / approve / offline */
  transition: (id: string, action: 'submit' | 'reject' | 'approve' | 'offline') =>
    request<LevelSummary>(`/admin/levels/${id}/${action}`, { method: 'POST' }),
};
