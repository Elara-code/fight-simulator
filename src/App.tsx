import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'
import SharePage from './pages/SharePage'
import MePage from './pages/MePage'
import AppShell from './components/AppShell'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result" element={<ResultsPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
