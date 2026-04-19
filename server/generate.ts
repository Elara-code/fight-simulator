import OpenAI from 'openai'
import { z } from 'zod'

export const StyleKey = z.enum(['savage', 'logic', 'sarcasm', 'calm'])
export type StyleKey = z.infer<typeof StyleKey>

export const Relation = z.enum(['couple', 'friend', 'work', 'family'])
export type Relation = z.infer<typeof Relation>

export const GenerateRequest = z.object({
  text: z.string().min(1).max(500),
  relation: Relation,
  style: StyleKey,
})
export type GenerateRequest = z.infer<typeof GenerateRequest>

const ReplySchema = z.object({
  me: z.string().min(1),
  dialog: z
    .array(
      z.object({
        them: z.string().min(1),
        me: z.string().min(1),
      }),
    )
    .min(1)
    .max(2),
})
export type Reply = z.infer<typeof ReplySchema>

const STYLE_DESC: Record<StyleKey, string> = {
  savage: '爽文反击：犀利、硬气、解气，像短视频爆款金句，能一句话戳到对方。',
  logic: '逻辑碾压：条理清晰，摆事实、指出对方的自相矛盾，但仍然带情绪。',
  sarcasm: '阴阳怪气：表面客气、暗藏嘲讽，大量反问和夸张比喻，杀人诛心。',
  calm: '冷静终结：不吵回去，点出问题+给出要求，留尊严也留底线。',
}

const RELATION_DESC: Record<Relation, string> = {
  couple: '情侣/伴侣之间',
  friend: '朋友之间',
  work: '同事/工作场合',
  family: '家人/亲戚之间',
}

const SYSTEM_PROMPT = `你是「吵架模拟器」的反击生成器。用户贴进一句让他没吵赢的话，你要替他吵回来。

【硬性规则】
1. 只输出中文。内容必须是一段「台词」，不是建议、不是分析、不是说明。
2. 绝不说「我建议你…」「可以这样回」「希望对你有帮助」这种元语言。
3. 不使用歧视、侮辱家人、人身攻击、脏话。可以犀利、可以刻薄，但不越线。
4. 换行用真实的 \\n（JSON 字符串里的 \\n），每行不过长，适合做聊天气泡。
5. 保持人物一致性：一段 me 从头到尾是同一个人，语气不要漂。

【风格说明】
- savage ${STYLE_DESC.savage}
- logic ${STYLE_DESC.logic}
- sarcasm ${STYLE_DESC.sarcasm}
- calm ${STYLE_DESC.calm}

【关系说明】
- couple ${RELATION_DESC.couple}
- friend ${RELATION_DESC.friend}
- work ${RELATION_DESC.work}
- family ${RELATION_DESC.family}

【输出格式】
严格输出一个 JSON 对象，不要带任何说明文字、不要包代码块标记。结构：
{
  "me": "主反击台词，2-4 行，行间用 \\n 分隔，每行不超过 30 个中文字。直接开怼。",
  "dialog": [
    {
      "them": "对方的后续反驳，1 行，口语，不超过 24 字",
      "me": "你的再反击，1-2 行，行间用 \\n 分隔，每行不超过 26 字，语气贴合所选风格"
    }
  ]
}
dialog 数组长度 1 到 2。所有字段都不能为空字符串。`

function buildClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    const err = new Error('DEEPSEEK_API_KEY is not set') as Error & {
      code?: string
    }
    err.code = 'NO_API_KEY'
    throw err
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  })
}

export async function generateReply(input: GenerateRequest): Promise<Reply> {
  const client = buildClient()
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const userPrompt = `【对方原话】
${input.text}

【关系】${RELATION_DESC[input.relation]}（${input.relation}）
【风格】${STYLE_DESC[input.style]}（${input.style}）

请用「${input.style}」风格，替我吵回这句话，并给出 1-2 轮后续对吵。只返回 JSON。`

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1500,
    temperature: 0.9,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) {
    throw new Error('Model returned empty content')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Model returned non-JSON content: ${raw.slice(0, 120)}`)
  }
  return ReplySchema.parse(parsed)
}
