import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { ToastProvider } from '../components/Toast'

// Happy path integration: type a message on the home page, submit it, land
// on the results page with the AI reply rendered. Runs in happy-dom — no
// real browser — and mocks /api/generate so it doesn't depend on DeepSeek.

function renderApp(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  )
}

const CANNED_REPLY = {
  me: '你敷衍的不是消息\n是我对你最后一点耐心。',
  dialog: [
    { them: '别这么说嘛', me: '那你也别这么做。' },
  ],
}

function mockFetchOk(payload: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('home → results happy path', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchOk(CANNED_REPLY))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits the textarea, navigates to /result, renders the reply', async () => {
    const user = userEvent.setup()
    renderApp('/')

    const textarea = await screen.findByLabelText('把对方说的话贴进来')
    await user.type(textarea, '你怎么这么敷衍我')

    // Find the submit button ("帮我吵回来") and click it.
    const submit = await screen.findByRole('button', { name: /帮我吵回来/ })
    await user.click(submit)

    // Reply should render on the results page.
    await waitFor(
      () => {
        expect(screen.getByText(/你敷衍的不是消息/)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    // Follow-up turn from the mocked dialog is also visible.
    expect(screen.getByText(/那你也别这么做/)).toBeInTheDocument()
  })

  it('shows an error toast and stays on home when API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: 'upstream_error', message: '模型服务暂不可用' }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const user = userEvent.setup()
    renderApp('/')

    const textarea = await screen.findByLabelText('把对方说的话贴进来')
    await user.type(textarea, '你怎么这么敷衍我')
    await user.click(await screen.findByRole('button', { name: /帮我吵回来/ }))

    await waitFor(
      () => {
        expect(screen.getByText(/模型服务暂不可用/)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    // Still on home — the textarea is still mounted.
    expect(screen.getByLabelText('把对方说的话贴进来')).toBeInTheDocument()
  })
})
