import type { Relation, StyleKey } from './api'

export type Scenario = {
  id: string
  emoji: string
  title: string
  text: string
  rel: Relation
  style: StyleKey
}

// Single source of truth for the 20 predefined scenarios. HomePage uses
// this to seed the quick-pick strip; ScenarioTopPage uses it to render
// per-scenario "see how others fought this" leaderboards.
export const SCENARIOS: Scenario[] = [
  // 情侣
  {
    id: 'cold_reply',
    emoji: '🧊',
    title: '对象不回消息',
    text: '没事别找我，有事发消息。',
    rel: 'couple',
    style: 'savage',
  },
  {
    id: 'excuse_late',
    emoji: '⏰',
    title: '迟到甩锅',
    text: '我刚在开会没听见你电话，至于吗？',
    rel: 'couple',
    style: 'logic',
  },
  {
    id: 'hidden_phone',
    emoji: '📱',
    title: '藏手机被发现',
    text: '那只是同事发的，你想多了。',
    rel: 'couple',
    style: 'calm',
  },
  {
    id: 'always_busy',
    emoji: '💤',
    title: '永远说在忙',
    text: '我最近工作太累，没空陪你，你懂事点。',
    rel: 'couple',
    style: 'savage',
  },
  {
    id: 'past_ex',
    emoji: '👻',
    title: '拿你跟前任比',
    text: '我前女友从来不会这么计较。',
    rel: 'couple',
    style: 'sarcasm',
  },
  {
    id: 'gaslight',
    emoji: '🌀',
    title: '情绪被否认',
    text: '你又在小题大做，这点事都要闹一晚。',
    rel: 'couple',
    style: 'logic',
  },
  // 朋友
  {
    id: 'friend_cancel',
    emoji: '🚪',
    title: '朋友放鸽子',
    text: '抱歉啊，临时有点事，下次吧。',
    rel: 'friend',
    style: 'savage',
  },
  {
    id: 'group_shade',
    emoji: '🐍',
    title: '群里被阴阳',
    text: '哟，某人这打扮还挺「有个性」的哈。',
    rel: 'friend',
    style: 'sarcasm',
  },
  {
    id: 'borrow_money',
    emoji: '💸',
    title: '借钱不还装死',
    text: '最近手紧，等我发工资就还你，别老催。',
    rel: 'friend',
    style: 'logic',
  },
  {
    id: 'stolen_idea',
    emoji: '💡',
    title: '想法被抢',
    text: '我最近想到一个绝招——就是上周你说过的那个。',
    rel: 'friend',
    style: 'sarcasm',
  },
  {
    id: 'single_push',
    emoji: '💍',
    title: '催你相亲',
    text: '你这年纪还挑什么挑，差不多就行了。',
    rel: 'friend',
    style: 'calm',
  },
  // 同事
  {
    id: 'boss_credit',
    emoji: '💼',
    title: '老板抢功劳',
    text: '这次项目做得不错，辛苦大家配合我这个方案。',
    rel: 'work',
    style: 'logic',
  },
  {
    id: 'scope_creep',
    emoji: '📎',
    title: '临时加活',
    text: '顺便帮我做一下这个，应该不难吧。',
    rel: 'work',
    style: 'calm',
  },
  {
    id: 'blame_shift',
    emoji: '🪃',
    title: '同事甩锅',
    text: '这块不是 A 负责的吗？我没跟进，你问他。',
    rel: 'work',
    style: 'logic',
  },
  {
    id: 'weekend_call',
    emoji: '📞',
    title: '周末被 cue',
    text: '有点急，周末能处理一下吗？就一点点。',
    rel: 'work',
    style: 'calm',
  },
  {
    id: 'passive_aggressive',
    emoji: '😬',
    title: '被动攻击式点评',
    text: '做得还行，就是不太够专业。',
    rel: 'work',
    style: 'sarcasm',
  },
  // 家人
  {
    id: 'family_marry',
    emoji: '💒',
    title: '亲戚逼婚',
    text: '你再不结婚，以后没人要你。',
    rel: 'family',
    style: 'calm',
  },
  {
    id: 'family_belittle',
    emoji: '🙄',
    title: '家人贬低你',
    text: '你看看人家孩子，再看看你。',
    rel: 'family',
    style: 'calm',
  },
  {
    id: 'money_judge',
    emoji: '💰',
    title: '议论你收入',
    text: '一个月才这点，够你自己吃吗。',
    rel: 'family',
    style: 'logic',
  },
  {
    id: 'career_doubt',
    emoji: '🧭',
    title: '质疑你工作',
    text: '你那工作能当饭吃？不如考个编制。',
    rel: 'family',
    style: 'savage',
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
