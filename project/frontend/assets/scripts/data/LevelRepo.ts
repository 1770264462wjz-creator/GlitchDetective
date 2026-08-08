/**
 * 关卡数据仓库：从后端拉取关卡（docs/08 §3.3/3.4）。
 * 仅拉取已发布关卡；token 由外部注入（登录后）。
 */

export interface LevelSummary {
  level_id: string;
  level_no: number;
  chapter_id: number;
  title: string;
  puzzle_type: string;
  difficulty: number;
  reward_stars: number;
  is_hidden: boolean;
  unlocked: boolean;
  stars: number;
  best_time_ms: number | null;
}

export interface LevelDetail {
  level_id: string;
  level_no: number;
  title: string;
  puzzle_type: string;
  difficulty: number;
  schema_version: string;
  reward_stars: number;
  hint_ids: string[];
  content: unknown; // Schema v1，由 LevelParser 解析
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class LevelRepo {
  private token: string | null = null;

  constructor(private baseUrl = 'http://localhost:2010/api/v1') {}

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });
    const body = (await res.json()) as ApiResponse<T>;
    if (body.code !== 0) {
      throw new Error(`后端错误 ${body.code}: ${body.message}`);
    }
    return body.data;
  }

  /** 关卡列表（仅已发布） */
  list(page = 1, pageSize = 20): Promise<{
    list: LevelSummary[];
    total: number;
    has_more: boolean;
  }> {
    return this.request(`/levels?page=${page}&page_size=${pageSize}`);
  }

  /** 关卡详情（含 content） */
  detail(levelId: string): Promise<LevelDetail> {
    return this.request(`/levels/${levelId}`);
  }
}
