import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { initAnalytics, initWebVitals, track } from './lib/analytics'
import { initSentry } from './lib/sentry'
import './index.css'

initSentry()
initAnalytics()
initWebVitals()
track('session_start')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
