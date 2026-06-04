type EventName =
  | 'session_start'
  | 'scenario_pick'
  | 'generate_submit'
  | 'generate_success'
  | 'generate_error'
  | 'style_switch'
  | 'copy'
  | 'regenerate'
  | 'share_click'
  | 'share_success'
  | 'replay_create'
  | 'replay_view'
  | 'replay_cta_click'
  | 'replay_report'
  | 'history_reopen'
  | 'train_start'
  | 'train_turn'
  | 'train_end'
  | 'train_retry'
  | 'train_save'
  | 'feed_view'
  | 'feed_item_click'
  | 'scenario_top_view'
  | 'scenario_top_click'
  | 'challenge_create'
  | 'challenge_create_from_result'
  | 'challenge_share'
  | 'challenge_view'
  | 'challenge_accept'
  | 'challenge_complete'
  | 'web_vitals'

type PostHogCapture = (event: string, props?: Record<string, unknown>) => void

let capture: PostHogCapture | null = null
const buffered: Array<{ event: EventName; props?: Record<string, unknown> }> = []

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  const host =
    import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  // Async-load posthog-js so it doesn't bloat the initial bundle.
  // Events fired before the SDK loads are buffered and flushed on init.
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        autocapture: false,
        persistence: 'localStorage',
        disable_session_recording: true,
      })
      capture = (event, props) => posthog.capture(event, props)
      for (const { event, props } of buffered) capture(event, props)
      buffered.length = 0
    })
    .catch(() => {
      /* analytics is best-effort; never crash the app */
    })
}

export function track(event: EventName, props?: Record<string, unknown>) {
  if (capture) {
    try {
      capture(event, props)
    } catch {
      /* swallow */
    }
    return
  }
  if (import.meta.env.VITE_POSTHOG_KEY) {
    buffered.push({ event, props })
  }
}

// Web Vitals — lazy-import so the measurement lib doesn't tax the main
// bundle. Each metric fires once its measurement stabilizes (LCP at first
// input, CLS on visibility change, etc.) and is forwarded to PostHog.
export function initWebVitals() {
  if (typeof window === 'undefined') return
  import('web-vitals')
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const send = (metric: {
        name: string
        value: number
        rating: string
        navigationType?: string
      }) => {
        track('web_vitals', {
          metric: metric.name,
          value: Math.round(metric.value * 1000) / 1000,
          rating: metric.rating,
          nav: metric.navigationType,
        })
      }
      onCLS(send)
      onINP(send)
      onLCP(send)
      onFCP(send)
      onTTFB(send)
    })
    .catch(() => {
      /* best-effort — don't let a measurement failure break anything */
    })
}
