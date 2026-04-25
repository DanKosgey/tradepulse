import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDeriv } from './context/DerivContext'
import { parseDerivOAuthHash } from './utils/authUtils'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import BotBuilder from './pages/BotBuilder'
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
    if (window.location.hash) {
      const accounts = parseDerivOAuthHash(window.location.hash)
      if (accounts.length > 0) {
        // Log in with the first account token
        login(accounts[0].token)
        
        // Optional: you could store all accounts if DerivContext supported it,
        // but for now we just login with the first one and clear hash.
        
        // Clear hash from URL for security and cleanliness
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [login])

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
          <Route index element={<Dashboard />} />
          <Route path="bot" element={<BotBuilder />} />
          <Route path="history" element={<History />} />
          <Route path="charts" element={<Charts />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
