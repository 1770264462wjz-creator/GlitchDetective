import { LevelContent } from './level-content.validator';

/**
 * 存储层关卡记录。M2 阶段使用内存种子源，M3 迁移到 MySQL（gd_level 表）。
 * status 状态机（docs/11 §6）：1 草稿 / 2 审核中 / 3 已发布 / 4 已下线。
 */
export interface StoredLevel {
  /** 全局序号（第几关），对外 level_id 即其十进制字符串 */
  globalNo: number;
  /** 章节号（对外 chapter_id int） */
  chapterNo: number;
  /** 章节内序号（对外 level_no） */
  order: number;
  /** 关卡内容（Schema v1） */
  content: LevelContent;
  /** 内容状态（docs/11 §6）：1 草稿 / 2 审核中 / 3 已发布 / 4 已下线 */
  status: 1 | 2 | 3 | 4;
}

/** 新建关卡入参（服务端分配 globalNo） */
export interface CreateLevelInput {
  content: LevelContent;
  chapterNo: number;
}

/** 更新关卡入参 */
export interface UpdateLevelInput {
  content: LevelContent;
  chapterNo?: number;
}

export interface LevelStore {
  /** 全部关卡（含草稿，管理端用） */
  findAll(): StoredLevel[];
  /** 仅已发布关卡（客户端用） */
  findPublished(): StoredLevel[];
  findByGlobalNo(globalNo: number): StoredLevel | undefined;
  /** 下一个可用的全局序号 */
  nextGlobalNo(): number;
  /** 创建关卡（status=1 草稿） */
  create(input: CreateLevelInput): StoredLevel;
  /** 更新关卡内容（不改变状态） */
  update(globalNo: number, input: UpdateLevelInput): StoredLevel | undefined;
  /** 状态流转 */
  setStatus(globalNo: number, status: 1 | 2 | 3 | 4): StoredLevel | undefined;
  /** 删除（仅草稿可删） */
  delete(globalNo: number): boolean;
}

/** LevelStore 注入 token（M3 换 MySQL 实现时仅替换 provider） */
export const LEVEL_STORE = 'LEVEL_STORE';

/** 关卡状态（docs/11 §6） */
export const LEVEL_STATUS = {
  DRAFT: 1,
  REVIEWING: 2,
  PUBLISHED: 3,
  OFFLINE: 4,
} as const;
