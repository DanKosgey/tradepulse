import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDeriv } from './context/DerivContext'
import { parseDerivOAuthParams } from './utils/authUtils'
import Layout from './components/Layout'
import Notification from './components/Notification'

const Landing = lazy(() => import('./pages/Landing'))
const LoadBot = lazy(() => import('./pages/LoadBot'))
const Analytics = lazy(() => import('./pages/Analytics'))
const VisualBotBuilder = lazy(() => import('./pages/VisualBotBuilder'))
const ManualTrader = lazy(() => import('./pages/ManualTrader'))
const History = lazy(() => import('./pages/History'))
const Charts = lazy(() => import('./pages/Charts'))
const Settings = lazy(() => import('./pages/Settings'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
)

function ProtectedRoute({ children }) {
  const { isAuthorized, apiToken } = useDeriv()
  if (!apiToken && !isAuthorized) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const { notification, login } = useDeriv()

  useEffect(() => {
    // No-op here, handled in DerivContext
  }, [])

  return (
    <div className="min-h-screen">
      {notification && <Notification data={notification} />}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<LoadBot />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="bot" element={<VisualBotBuilder />} />
            <Route path="manual-trader" element={<ManualTrader />} />
            <Route path="history" element={<History />} />
            <Route path="charts" element={<Charts />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
