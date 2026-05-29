import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/context/AuthContext";
import { ThemeProvider } from "@/shared/ui/ThemeProvider";

import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";

import DashboardLayout from "@/features/user/pages/UserLayout";
import DashboardPage from "@/features/user/pages/DashboardPage";
import LearningPage from "@/features/user/pages/LearningPage";
import ChatStartPage from "@/features/user/pages/ChatStartPage";
import ChatPage from "@/features/user/pages/ChatPage";
import QuizPage from "@/features/user/pages/QuizPage";
import MindmapPage from "@/features/user/pages/MindmapPage";
import MindmapListPage from "@/features/user/pages/MindmapListPage";
import PracticePage from "@/features/user/pages/PracticePage";
import SettingsPage from "@/features/user/pages/SettingsPage";
import HelpPage from "@/features/user/pages/HelpPage";
import PricingPage from "@/features/user/pages/PricingPage";
import ShareRedirect from "@/features/user/pages/ShareRedirect";

import AdminLayout from "@/features/admin/pages/AdminLayout";
import AdminLoginPage from "@/features/admin/pages/LoginPage";
import AdminDashboardPage from "@/features/admin/pages/DashboardPage";
import AdminUsersPage from "@/features/admin/pages/UsersPage";
import AdminDocumentsPage from "@/features/admin/pages/DocumentsPage";
import AdminPlansPage from "@/features/admin/pages/PlansPage";
import AdminRevenuePage from "@/features/admin/pages/RevenuePage";
import AdminActivityPage from "@/features/admin/pages/ActivityPage";
import AdminAuditPage from "@/features/admin/pages/AuditPage";

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
  const location = useLocation();

  if (isInitialLoading) {
    return <AppRouteShimmer />;
  }

  if (!isAuthenticated) {
    const redirectTo = location.pathname + location.search;
    const loginUrl = redirectTo && redirectTo !== "/" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    return <Navigate to={loginUrl} replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return <AppRouteShimmer />;
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return user?.role === "ADMIN" ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  const { user, isAuthenticated, isInitialLoading } = useAuth();
  const [searchParams] = useSearchParams();
  if (isInitialLoading) return <AppRouteShimmer />;
  if (!isAuthenticated) return children;
  const redirect = searchParams.get("redirect");
  if (redirect && redirect !== "/") return <Navigate to={redirect} replace />;
  return <Navigate to={user?.role === "ADMIN" ? "/admin" : "/"} replace />;
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
              <Route
                path="/admin/login"
                element={
                  <PublicRoute>
                    <AdminLoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="documents" element={<AdminDocumentsPage />} />
                <Route path="plans" element={<AdminPlansPage />} />
                <Route path="revenue" element={<AdminRevenuePage />} />
                <Route path="activity" element={<AdminActivityPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>

              <Route path="/shared/:shareId" element={<PrivateRoute><ShareRedirect /></PrivateRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
