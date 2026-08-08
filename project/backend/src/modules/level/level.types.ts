import { LevelContent } from './level-content.validator';

/**
 * 关卡 API 契约类型（docs/08 §3.3 / §3.4）。
 * 注意：对外 level_id = 全局序号十进制字符串；level_no = 章节内序号。
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
  content: LevelContent;
}

export interface LevelListResult {
  list: LevelSummary[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface LevelListQuery {
  chapterId?: number;
  puzzleType?: string;
  page: number;
  pageSize: number;
}
