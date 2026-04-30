import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDeriv } from './context/DerivContext'
import { parseDerivOAuthParams } from './utils/authUtils'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import LoadBot from './pages/LoadBot'
import Analytics from './pages/Analytics'
import VisualBotBuilder from './pages/VisualBotBuilder'
import ManualTrader from './pages/ManualTrader'
import History from './pages/History'
import Charts from './pages/Charts'
import Settings from './pages/Settings'
import Notification from './components/Notification'

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
    </div>
  )
}
