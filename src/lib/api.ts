export type StyleKey = 'savage' | 'logic' | 'sarcasm' | 'calm'
export type Relation = 'couple' | 'friend' | 'work' | 'family'

export type Reply = {
  me: string
  dialog: { them: string; me: string }[]
}

export type GenerateRequest = {
  text: string
  relation: Relation
  style: StyleKey
}

export async function generateReply(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<Reply> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`generate failed: ${res.status} ${text}`)
  }
  return (await res.json()) as Reply
}
