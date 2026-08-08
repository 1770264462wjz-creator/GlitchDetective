import { LevelContent } from './level-content.validator';

/**
 * 存储层关卡记录。M2 阶段使用内存种子源，M3 迁移到 MySQL（gd_level 表）。
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
}

export interface LevelStore {
  findAll(): StoredLevel[];
  findByGlobalNo(globalNo: number): StoredLevel | undefined;
}

/** LevelStore 注入 token（M3 换 MySQL 实现时仅替换 provider） */
export const LEVEL_STORE = 'LEVEL_STORE';
