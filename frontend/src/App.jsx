import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Navbar from './components/Navbar'
import BackendStatus from './components/BackendStatus'
import MenteeDashboard from './dashboards/MenteeDashboard'
import MentorDashboard from './dashboards/MentorDashboard'
import AdminDashboard from './dashboards/AdminDashboard'

function Shell() {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  if (loading) {
    return <div className="p-16 text-center text-sm text-slate-400">Loading…</div>
  }

  if (!user) {
    return showLogin ? (
      <LoginPage onBack={() => setShowLogin(false)} />
    ) : (
      <LandingPage onGetStarted={() => setShowLogin(true)} />
    )
  }

  const Dashboard =
    user.role === 'admin' ? AdminDashboard : user.role === 'mentor' ? MentorDashboard : MenteeDashboard

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <Navbar />
      <Dashboard />
      <BackendStatus />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
