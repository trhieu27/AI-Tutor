import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'

// Auth pages
import LoginPage from '@/app/(auth)/login/page'
import RegisterPage from '@/app/(auth)/register/page'
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'

// Dashboard pages
import DashboardLayout from '@/app/(dashboard)/layout'
import DashboardPage from '@/app/(dashboard)/page'
import LearningPage from '@/app/(dashboard)/learning/page'
import ChatPage from '@/app/(dashboard)/chat/[documentId]/page'
import QuizPage from '@/app/(dashboard)/quiz/[documentId]/page'
import MindmapPage from '@/app/(dashboard)/mindmap/[documentId]/page'
import PracticePage from '@/app/(dashboard)/practice/page'
import SettingsPage from '@/app/(dashboard)/settings/page'
import HelpPage from '@/app/(dashboard)/help/page'

function PrivateRoute({ children }) {
  const { isAuthenticated, isInitialLoading } = useAuth()
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[hsl(239_68%_58%)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, isInitialLoading } = useAuth()
  if (isInitialLoading) return null
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Dashboard routes */}
          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/chat/:documentId" element={<ChatPage />} />
            <Route path="/quiz/:documentId" element={<QuizPage />} />
            <Route path="/mindmap/:documentId" element={<MindmapPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
