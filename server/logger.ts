type Level = 'info' | 'warn' | 'error'

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra ?? {}),
  }
  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(payload)
      : `[${level}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`
  const out: (s: string) => void =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(line)
}

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => emit('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit('error', msg, extra),
}
