import { LevelContent } from '../level-content.validator';

/**
 * 第 2 关《打不开的门》reverse ★2
 * 逆向思维：门上贴着「推」，但门其实是向外拉的。
 */
export const levelTwoContent: LevelContent = {
  schemaVersion: '1.0.0',
  levelId: 'level_002',
  chapterId: 'chapter_02',
  order: 2,
  title: '打不开的门',
  puzzleType: 'reverse',
  difficulty: 2,
  unlock: { type: 'previous', levelId: 'level_001' },
  story: {
    intro: '门上贴着大大的「推」字，可怎么推都推不动。',
    introTalk: '「奇怪，门明明写着推……为什么纹丝不动？」',
    outro: '原来「推」是给门里的人看的——门要向外拉。',
    outroTalk: '「搞了半天，这门是往外拉的！」',
  },
  scene: {
    background: 'bg_hallway',
    objects: [
      {
        id: 'door',
        type: 'sprite',
        spriteKey: 'obj_door',
        position: { x: 0, y: -40 },
        zIndex: 2,
        interactive: true,
        actions: [
          {
            id: 'wrong_push_door',
            trigger: 'tap',
            targetId: 'door',
            result: 'wrong',
            feedback: {
              bugTalk: '门纹丝不动——难道被锁住了？',
              toast: '门没有锁，只是方向不对。',
              sound: 'sfx_wrong',
              vibrate: true,
            },
          },
        ],
      },
      {
        id: 'handle',
        type: 'sprite',
        spriteKey: 'obj_door_handle',
        position: { x: 120, y: 40 },
        zIndex: 3,
        interactive: true,
        actions: [
          {
            id: 'right_pull_handle',
            trigger: 'drag',
            targetId: 'handle',
            payload: { dragTo: 'door' },
            result: 'right',
            feedback: {
              bugTalk: '门没锁，只是要向外拉，不是往里推。',
              toast: '拉动门把手，门开了！',
              sound: 'sfx_success',
            },
            onSuccess: { unlockBugLog: true, gotoResult: true },
          },
        ],
      },
      {
        id: 'sign',
        type: 'label',
        text: '推',
        position: { x: -40, y: 30 },
        zIndex: 4,
        interactive: false,
      },
    ],
    camera: { initialZoom: 1, maxZoom: 1.2 },
  },
  misleadLayer: {
    description: '玩家被「推」字误导，反复推门。',
    actions: [{ id: 'wrong_push_door', trigger: 'tap', targetId: 'door', result: 'wrong' }],
  },
  truthLayer: {
    description: '把门把手向外拉（drag handle → door）。',
    successMode: 'any',
    actions: [{ id: 'right_pull_handle', trigger: 'drag', targetId: 'handle', result: 'right' }],
  },
  hints: [
    {
      level: 1,
      text: '「推」这个字，是给谁看的？',
      cost: { ad: false, coins: 0 },
    },
    {
      level: 2,
      text: '门没锁，想想推的反方向。',
      cost: { ad: true, coins: 0 },
      cooldownSeconds: 30,
    },
    {
      level: 3,
      text: '试试拖动门把手往外拉。',
      cost: { ad: true, coins: 50 },
      cooldownSeconds: 60,
    },
  ],
  bugLog: {
    id: 'Bug002',
    title: '打不开的门',
    detail: '门并没有锁，推不开是因为门其实要向外拉。',
    reward: { coins: 50, xp: 20 },
  },
  tags: ['反向思维', '文字误导'],
};
