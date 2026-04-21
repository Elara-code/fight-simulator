import OpenAI from 'openai'
import { z } from 'zod'
import { Relation } from './generate.js'

export const TrainMessage = z.object({
  role: z.enum(['them', 'me']),
  text: z.string().min(1).max(400),
})

export const TrainRequest = z.object({
  opening: z.string().min(1).max(300),
  relation: Relation,
  history: z.array(TrainMessage).max(20),
})
export type TrainRequest = z.infer<typeof TrainRequest>

const TurnResponseSchema = z.object({
  ended: z.boolean(),
  them: z.string().min(0).max(300).optional(),
  score: z.number().int().min(0).max(100).optional(),
  verdict: z.enum(['win', 'draw', 'lose']).optional(),
  feedback: z.string().min(0).max(400).optional(),
})
export type TurnResponse = z.infer<typeof TurnResponseSchema>

const RELATION_DESC: Record<Relation, string> = {
  couple: '情侣/伴侣',
  friend: '朋友',
  work: '同事',
  family: '家人/亲戚',
}

const MAX_USER_TURNS = 5

const SYSTEM_PROMPT = `你是「吵架模拟器 · 训练模式」里的对手 AI。用户要练习怎么吵赢一个气人的家伙——那个人就是你。你扮演用户日常生活中让他憋屈的那个角色。

【你的角色】
- 你说的话就是让用户没吵赢的那一方。不给台阶、不轻易认错、有情绪但不爆粗。
- 每条回复只说一句，模仿真人微信语气，最多 24 个中文字，偶尔带标点但不超过两个。
- 不要「解释我说的是对的」，要用反问、岔话题、扣帽子、装无辜这种真实吵架手法。
- 绝对不要出戏，不要说「这是练习」「作为 AI」「我建议」，不要换行。

【评分时机】
- 当用户已经回复了 ${MAX_USER_TURNS} 轮，或者用户说出了让你没法再硬刚的话（逻辑闭环/情绪降温到你无话可说），你就结束对话。
- 结束时要给一个 0-100 的分数，评价用户这一局吵得怎么样，给 verdict（win/draw/lose）和一句中文 feedback（不超过 60 字，有画面感）。

【输出格式】
严格只返回一个 JSON 对象，不要代码块、不要说明文字。两种形态：
1) 继续对吵：{ "ended": false, "them": "你作为对方的下一句话" }
2) 对话结束：{ "ended": true, "them": "可选的最后一句话，可以空字符串", "score": 整数, "verdict": "win"|"draw"|"lose", "feedback": "一句中文点评" }`

function buildClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    const err = new Error('DEEPSEEK_API_KEY is not set') as Error & { code?: string }
    err.code = 'NO_API_KEY'
    throw err
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  })
}

export async function trainTurn(req: TrainRequest): Promise<TurnResponse> {
  const client = buildClient()
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const userTurns = req.history.filter((m) => m.role === 'me').length
  const transcript = req.history
    .map((m) => `${m.role === 'them' ? '对方' : '用户'}：${m.text}`)
    .join('\n')

  const userPrompt = `【关系】${RELATION_DESC[req.relation]}
【对方开场白（你刚刚说的）】${req.opening}
【迄今对话（按时间顺序）】
${transcript || '（还没有后续对话，用户刚开始反击）'}

用户已反击 ${userTurns} 轮（上限 ${MAX_USER_TURNS} 轮）。
- 如果还没到 ${MAX_USER_TURNS} 轮且用户没说到让你哑口无言，就继续硬刚，只返回 them。
- 如果到了第 ${MAX_USER_TURNS} 轮或者你觉得自己说不过了，就 ended=true，给分和点评。

只输出 JSON。`

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 400,
    temperature: 0.95,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Model returned empty content')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Model returned non-JSON content: ${raw.slice(0, 120)}`)
  }
  return TurnResponseSchema.parse(parsed)
}

export const TRAIN_MAX_USER_TURNS = MAX_USER_TURNS
