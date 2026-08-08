import { LevelContent } from '../level-content.validator';

/**
 * 第 1 关《关掉的灯还亮着》visual ★2
 * 对应 docs/04 §10.1 示例设计：台灯没坏，光是月光反射。
 */
export const levelOneContent: LevelContent = {
  schemaVersion: '1.0.0',
  levelId: 'level_001',
  chapterId: 'chapter_01',
  order: 1,
  title: '关掉的灯还亮着',
  puzzleType: 'visual',
  difficulty: 2,
  unlock: { type: 'auto' },
  story: {
    intro: '深夜停电，你却看见台灯亮着。',
    introTalk: '「奇怪……灯是关着的，可它还在发光。」',
    outro: '原来光不是来自台灯，而是窗外的月亮。',
    outroTalk: '「吓我一跳，是月光照在灯罩上反射出来的。」',
  },
  scene: {
    background: 'bg_room_night',
    objects: [
      {
        id: 'lamp',
        type: 'sprite',
        spriteKey: 'obj_lamp_on',
        position: { x: 260, y: -60 },
        zIndex: 3,
        interactive: true,
        actions: [
          {
            id: 'wrong_touch_lamp',
            trigger: 'tap',
            targetId: 'lamp',
            result: 'wrong',
            feedback: {
              bugTalk: '台灯纹丝不动——它明明关着，怎么会亮？',
              toast: '台灯并没有通电。',
              sound: 'sfx_wrong',
              vibrate: true,
            },
          },
        ],
      },
      {
        id: 'moon',
        type: 'sprite',
        spriteKey: 'obj_moon',
        position: { x: 380, y: 240 },
        zIndex: 1,
        interactive: true,
        actions: [
          {
            id: 'right_tap_moon',
            trigger: 'tap',
            targetId: 'moon',
            result: 'right',
            feedback: {
              bugTalk: '灯没坏——光是从月亮那来的，照在灯罩上反射了。',
              toast: '原来如此！',
              sound: 'sfx_success',
            },
            onSuccess: { unlockBugLog: true, gotoResult: true },
          },
        ],
      },
      {
        id: 'window',
        type: 'sprite',
        spriteKey: 'obj_window',
        position: { x: 340, y: 60 },
        zIndex: 2,
        interactive: false,
      },
      {
        id: 'desk',
        type: 'sprite',
        spriteKey: 'obj_desk',
        position: { x: 200, y: -220 },
        zIndex: 2,
        interactive: false,
      },
    ],
    camera: { initialZoom: 1, maxZoom: 1.4 },
  },
  misleadLayer: {
    description: '玩家误以为台灯坏了，反复点击台灯。',
    actions: [{ id: 'wrong_touch_lamp', trigger: 'tap', targetId: 'lamp', result: 'wrong' }],
  },
  truthLayer: {
    description: '真相是月光经灯罩反射，点击月亮完成。',
    successMode: 'any',
    actions: [{ id: 'right_tap_moon', trigger: 'tap', targetId: 'moon', result: 'right' }],
  },
  hints: [
    {
      level: 1,
      text: '先别急着修灯，想想光是从哪里来的。',
      cost: { ad: false, coins: 0 },
    },
    {
      level: 2,
      text: '注意到窗外了吗？',
      cost: { ad: true, coins: 0 },
      cooldownSeconds: 30,
    },
    {
      level: 3,
      text: '点一点月亮试试看。',
      cost: { ad: true, coins: 50 },
      cooldownSeconds: 60,
    },
  ],
  bugLog: {
    id: 'Bug001',
    title: '关掉的灯还亮着',
    detail: '台灯并未通电，亮光来自窗外的月光反射。',
    reward: { coins: 50, xp: 20 },
  },
  tags: ['月光反射', '错觉'],
};
