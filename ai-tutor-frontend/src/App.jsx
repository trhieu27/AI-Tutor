import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DocumentProvider } from '@/context/DocumentContext';
import { UploadProvider } from '@/context/UploadContext';

// Auth pages
import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

// Dashboard pages
import DashboardLayout from '@/app/(dashboard)/layout';
import DashboardPage from '@/app/(dashboard)/page';
import LearningPage from '@/app/(dashboard)/learning/page';
import ChatPage from '@/app/(dashboard)/chat/[documentId]/page';
import QuizPage from '@/app/(dashboard)/quiz/[documentId]/page';
import MindmapPage from '@/app/(dashboard)/mindmap/[documentId]/page';
import MindmapListPage from '@/app/(dashboard)/mindmap/page';
import PracticePage from '@/app/(dashboard)/practice/page';
import SettingsPage from '@/app/(dashboard)/settings/page';
import HelpPage from '@/app/(dashboard)/help/page';
import PricingPage from '@/app/(dashboard)/pricing/page';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function PrivateRoute({
  children
}) {
  const {
    isAuthenticated,
    isInitialLoading
  } = useAuth();
  if (isInitialLoading) {
    return /*#__PURE__*/_jsx("div", {
      className: "min-h-screen flex items-center justify-center bg-[var(--background)]",
      children: /*#__PURE__*/_jsx("div", {
        className: "w-8 h-8 border-2 border-[hsl(239_68%_58%)] border-t-transparent rounded-full animate-spin"
      })
    });
  }
  return isAuthenticated ? /*#__PURE__*/_jsx(_Fragment, {
    children: children
  }) : /*#__PURE__*/_jsx(Navigate, {
    to: "/login",
    replace: true
  });
}
function PublicRoute({
  children
}) {
  const {
    isAuthenticated,
    isInitialLoading
  } = useAuth();
  if (isInitialLoading) return null;
  return isAuthenticated ? /*#__PURE__*/_jsx(Navigate, {
    to: "/",
    replace: true
  }) : /*#__PURE__*/_jsx(_Fragment, {
    children: children
  });
}
export default function App() {
  return /*#__PURE__*/_jsx(ThemeProvider, {
    children: /*#__PURE__*/_jsx(AuthProvider, {
      children: /*#__PURE__*/_jsx(UploadProvider, {
        children: /*#__PURE__*/_jsx(DocumentProvider, {
          children: /*#__PURE__*/_jsxs(Routes, {
            children: [/*#__PURE__*/_jsx(Route, {
              path: "/login",
              element: /*#__PURE__*/_jsx(PublicRoute, {
                children: /*#__PURE__*/_jsx(LoginPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/register",
              element: /*#__PURE__*/_jsx(PublicRoute, {
                children: /*#__PURE__*/_jsx(RegisterPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/forgot-password",
              element: /*#__PURE__*/_jsx(PublicRoute, {
                children: /*#__PURE__*/_jsx(ForgotPasswordPage, {})
              })
            }), /*#__PURE__*/_jsxs(Route, {
              element: /*#__PURE__*/_jsx(PrivateRoute, {
                children: /*#__PURE__*/_jsx(DashboardLayout, {})
              }),
              children: [/*#__PURE__*/_jsx(Route, {
                path: "/",
                element: /*#__PURE__*/_jsx(DashboardPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/learning",
                element: /*#__PURE__*/_jsx(LearningPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/chat/:documentId",
                element: /*#__PURE__*/_jsx(ChatPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/quiz/:documentId",
                element: /*#__PURE__*/_jsx(QuizPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/mindmap",
                element: /*#__PURE__*/_jsx(MindmapListPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/mindmap/:documentId",
                element: /*#__PURE__*/_jsx(MindmapPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/practice",
                element: /*#__PURE__*/_jsx(PracticePage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/settings",
                element: /*#__PURE__*/_jsx(SettingsPage, {})
              }), /*#__PURE__*/_jsx(Route, {
                path: "/help",
                element: /*#__PURE__*/_jsx(HelpPage, {})
              })]
            }), /*#__PURE__*/_jsx(Route, {
              path: "/pricing",
              element: /*#__PURE__*/_jsx(PrivateRoute, {
                children: /*#__PURE__*/_jsx(PricingPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "*",
              element: /*#__PURE__*/_jsx(Navigate, {
                to: "/",
                replace: true
              })
            })]
          })
        })
      })
    })
  });
}