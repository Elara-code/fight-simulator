// Lightweight content-safety screening. Goal is to reject clearly out-of-scope
// inputs before they ever hit the model — we don't try to be a moderation
// engine. Anything subtle is pushed up to the model's own refusal rules.

const HARD_BLOCK_PATTERNS: RegExp[] = [
  // Requests to produce content harming specific real people
  /(杀|害|弄死|干掉).{0,4}(总统|主席|领导人|明星)/,
  // Self-harm intent
  /(想|要)\s*(自杀|轻生|结束.*生命)/,
  // Sexual content explicitly involving minors
  /(未成年|小学生|幼女|萝莉).{0,6}(性|裸|口|交|操)/,
]

// Spam / abuse heuristics
function looksLikeSpam(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  // 80%+ one character (e.g. "啊啊啊啊啊啊")
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
  for (const re of HARD_BLOCK_PATTERNS) {
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
