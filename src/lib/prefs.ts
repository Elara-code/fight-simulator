import type { GenerateHint, StyleKey } from './api'

const STYLE_KEY = 'fightsim.prefs.style.v1'
const HINT_KEY = 'fightsim.prefs.hint.v1'

const VALID_STYLES: StyleKey[] = ['savage', 'logic', 'sarcasm', 'calm', 'classic']
const VALID_HINTS: GenerateHint[] = ['harder', 'softer', 'different']

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* quota / private mode — swallow */
  }
}

export function getStylePref(): StyleKey | null {
  const v = read(STYLE_KEY)
  return v && (VALID_STYLES as string[]).includes(v) ? (v as StyleKey) : null
}

export function setStylePref(style: StyleKey) {
  write(STYLE_KEY, style)
}

export function getHintPref(): GenerateHint | null {
  const v = read(HINT_KEY)
  return v && (VALID_HINTS as string[]).includes(v) ? (v as GenerateHint) : null
}

export function setHintPref(hint: GenerateHint) {
  write(HINT_KEY, hint)
}
