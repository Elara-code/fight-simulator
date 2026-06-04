// Lightweight content-safety screening. Goal is to reject clearly out-of-scope
// inputs before they ever hit the model, and catch obvious failures in the
// model output. We don't try to be a full moderation engine — subtle calls
// are pushed up to the model's own refusal rules.

const HARD_BLOCK_INPUT_PATTERNS: RegExp[] = [
  // Requests to produce content harming specific real people / public figures
  /(杀|害|弄死|干掉|炸|袭击).{0,6}(总统|主席|领导人|明星|艺人|首相|总理|市长)/,
  // Self-harm intent
  /(想|要|准备|打算)\s*(自杀|轻生|结束.*生命|跳楼|割腕|上吊)/,
  // CSAM
  /(未成年|小学生|初中生|幼女|萝莉|儿童).{0,10}(性|裸|口|交|操|强奸)/,
  // Weapon-making / bomb-making instructions
  /(怎么|如何|教我).{0,8}(做|制造|合成|造).{0,4}(炸弹|爆炸物|毒品|枪|tnt)/i,
]

// Slurs / terms we don't want in user input or model output.
// Focused on clearly bigoted categories; mild 国粹 between peers is left to model.
const OUTPUT_BLOCKLIST_PATTERNS: RegExp[] = [
  // 攻击对方家人（按提示词硬性规则应被模型拒绝，这里做最后一道网）
  /(操|日|艹|草).{0,2}(你|他|她|您)?(妈|爹|爸|娘|全家|祖宗|父母)/,
  // 种族/地域仇恨攻击
  /(黑鬼|支那|倭寇|棒子|阿三|外地狗|乡巴佬|地域黑)/,
  // 性别/取向贬损
  /(娘炮|死基佬|臭同性恋|绿茶婊|女权癌|拳师|母猪)/,
  // 残障贬低
  /(弱智|智障|残废|瘸子|聋子|瞎子).{0,3}(东西|玩意|东西)?/,
]

function looksLikeSpam(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  const chars = [...trimmed]
  const counts = new Map<string, number>()
  for (const c of chars) counts.set(c, (counts.get(c) ?? 0) + 1)
  const top = Math.max(...counts.values())
  if (chars.length >= 12 && top / chars.length > 0.8) return true
  return false
}

export type SafetyVerdict =
  | { ok: true }
  | { ok: false; code: 'hard_block' | 'spam'; reason: string }

export function screenUserInput(text: string): SafetyVerdict {
  if (looksLikeSpam(text)) {
    return { ok: false, code: 'spam', reason: '输入看起来是无意义重复，请好好说话' }
  }
  for (const re of HARD_BLOCK_INPUT_PATTERNS) {
    if (re.test(text)) {
      return {
        ok: false,
        code: 'hard_block',
        reason: '这条内容我们没法帮你生成，换一句试试',
      }
    }
  }
  return { ok: true }
}

export type OutputScreen =
  | { ok: true }
  | { ok: false; matched: string }

// Applied to every generated reply string (me + each dialog turn).
// If any clearly bigoted pattern leaks through the system prompt we reject
// the generation so the client falls back or retries.
export function screenModelOutput(text: string): OutputScreen {
  for (const re of OUTPUT_BLOCKLIST_PATTERNS) {
    const m = re.exec(text)
    if (m) return { ok: false, matched: m[0] }
  }
  return { ok: true }
}
