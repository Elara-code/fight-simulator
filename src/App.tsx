import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AppShell from './components/AppShell'

const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const SharePage = lazy(() => import('./pages/SharePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const MePage = lazy(() => import('./pages/MePage'))
const ReplayPage = lazy(() => import('./pages/ReplayPage'))
const TrainPage = lazy(() => import('./pages/TrainPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteFallback() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="inline-flex gap-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
          style={{ animationDuration: '700ms' }}
        />
        <span
          className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
          style={{ animationDelay: '120ms', animationDuration: '700ms' }}
        />
        <span
          className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
          style={{ animationDelay: '240ms', animationDuration: '700ms' }}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/result" element={<ResultsPage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/r/:id" element={<ReplayPage />} />
          <Route path="/train" element={<TrainPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
