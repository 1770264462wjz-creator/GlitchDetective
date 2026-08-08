import { LevelContent } from '../level-content.validator';

/**
 * 第 3 关《第二杯半价》language ★2
 * 文字陷阱：宣传语「第二杯半价」，小字规则隐藏了「需购 3 杯」的前提。
 */
export const levelThreeContent: LevelContent = {
  schemaVersion: '1.0.0',
  levelId: 'level_003',
  chapterId: 'chapter_02',
  order: 3,
  title: '第二杯半价',
  puzzleType: 'target',
  difficulty: 2,
  unlock: { type: 'previous', levelId: 'level_002' },
  story: {
    intro: '奶茶店招牌写着「第二杯半价」，你觉得很划算。',
    introTalk: '「买两杯的话，不就是 75 折嘛！」',
    outro: '小字规则：第 2 杯半价的前提，是买 3 杯。',
    outroTalk: '「原来如此……宣传语只说了一半。」',
  },
  scene: {
    background: 'bg_shop',
    objects: [
      {
        id: 'sign',
        type: 'label',
        text: '第二杯半价',
        position: { x: 0, y: 120 },
        zIndex: 3,
        interactive: true,
        actions: [
          {
            id: 'wrong_read_sign',
            trigger: 'tap',
            targetId: 'sign',
            result: 'wrong',
            feedback: {
              bugTalk: '买两杯就是 12 + 6 = 18 元，75 折，赚了！',
              toast: '再仔细看看价目表。',
              sound: 'sfx_wrong',
            },
          },
        ],
      },
      {
        id: 'price_board',
        type: 'label',
        text: '规则小字：第 2 杯半价（需购 3 杯）',
        position: { x: 0, y: -80 },
        zIndex: 3,
        interactive: true,
        actions: [
          {
            id: 'right_read_board',
            trigger: 'tap',
            targetId: 'price_board',
            result: 'right',
            feedback: {
              bugTalk: '第 2 杯半价的前提是买 3 杯——宣传语只说了一半。',
              toast: '找到隐藏规则了！',
              sound: 'sfx_success',
            },
            onSuccess: { unlockBugLog: true, gotoResult: true },
          },
        ],
      },
      {
        id: 'counter',
        type: 'sprite',
        spriteKey: 'obj_counter',
        position: { x: 0, y: -240 },
        zIndex: 2,
        interactive: false,
      },
    ],
    camera: { initialZoom: 1, maxZoom: 1.3 },
  },
  misleadLayer: {
    description: '玩家看到「第二杯半价」就认定两杯 75 折。',
    actions: [{ id: 'wrong_read_sign', trigger: 'tap', targetId: 'sign', result: 'wrong' }],
  },
  truthLayer: {
    description: '查看价目表小字，发现隐藏前提。',
    successMode: 'any',
    actions: [{ id: 'right_read_board', trigger: 'tap', targetId: 'price_board', result: 'right' }],
  },
  hints: [
    {
      level: 1,
      text: '宣传语只说了一半，另一半藏在哪里？',
      cost: { ad: false, coins: 0 },
    },
    {
      level: 2,
      text: '看看价目表上的小字。',
      cost: { ad: true, coins: 0 },
      cooldownSeconds: 30,
    },
    {
      level: 3,
      text: '点一点价目表。',
      cost: { ad: true, coins: 50 },
      cooldownSeconds: 60,
    },
  ],
  bugLog: {
    id: 'Bug003',
    title: '第二杯半价',
    detail: '「第二杯半价」的宣传语隐藏了「需购 3 杯」的前提，是典型的文字游戏。',
    reward: { coins: 50, xp: 20 },
  },
  tags: ['文字游戏', '隐藏规则'],
};
