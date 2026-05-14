import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

import DashboardLayout from "@/app/(dashboard)/layout";
import DashboardPage from "@/app/(dashboard)/page";
import LearningPage from "@/app/(dashboard)/learning/page";
import ChatStartPage from "@/app/(dashboard)/chat/page";
import ChatPage from "@/app/(dashboard)/chat/[documentId]/page";
import QuizPage from "@/app/(dashboard)/quiz/[documentId]/page";
import MindmapPage from "@/app/(dashboard)/mindmap/[documentId]/page";
import MindmapListPage from "@/app/(dashboard)/mindmap/page";
import PracticePage from "@/app/(dashboard)/practice/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import HelpPage from "@/app/(dashboard)/help/page";
import PricingPage from "@/app/(dashboard)/pricing/page";

function AppRouteShimmer() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6" role="status" aria-label="Đang tải" aria-busy="true">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="premium-skeleton h-12 w-12 shrink-0 rounded-[var(--radius-panel)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="premium-skeleton h-4 w-2/5" />
            <div className="premium-skeleton h-3 w-3/5" />
          </div>
        </div>
        <div className="premium-skeleton h-32 rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return <AppRouteShimmer />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isInitialLoading } = useAuth();
  if (isInitialLoading) return <AppRouteShimmer />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />

              <Route
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/learning" element={<LearningPage />} />
                <Route path="/chat" element={<ChatStartPage />} />
                <Route path="/chat/:documentId" element={<ChatPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/quiz/:documentId" element={<QuizPage />} />
                <Route path="/mindmap" element={<MindmapListPage />} />
                <Route path="/mindmap/:documentId" element={<MindmapPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<HelpPage />} />
              </Route>

              <Route
                path="/pricing"
                element={
                  <PrivateRoute>
                    <PricingPage />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
