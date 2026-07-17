import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "@/features/user/components/Header";
import Sidebar from "@/features/user/components/Sidebar";
import { NotificationToastProvider } from "@/shared/ui/NotificationToast";
import { DocumentProvider } from "@/features/user/context/DocumentContext";
import { UploadProvider } from "@/features/user/context/UploadContext";
import { APP_SHELL_TEXTS } from "@/shared/constants/texts";

const FULLSCREEN_PATTERNS = [/^\/chat\/[^/]+/, /^\/mindmap\//];

function isFullscreen(pathname) {
  return FULLSCREEN_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const fullscreen = isFullscreen(location.pathname);

  useEffect(() => {
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });

    document.documentElement.style.overflow = fullscreen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [fullscreen, location.pathname]);

  return (
    <NotificationToastProvider>
      <UploadProvider>
        <DocumentProvider>
          {isSidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-[oklch(12%_0.018_238/0.80)] backdrop-blur-md lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label={APP_SHELL_TEXTS.sidebar.closeNavigation}
            />
          )}

          <div
            className={`fixed inset-y-0 left-0 z-[60] w-64 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0`}
          >
            <div className="hidden lg:block h-full">
              <Sidebar />
            </div>
            <div className="lg:hidden h-full">
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </div>
          </div>

          <div
            className="fixed left-0 right-0 top-0 z-40 lg:pl-64"
            style={{ transform: "translateZ(0)", willChange: "transform", backfaceVisibility: "hidden" }}
          >
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
          </div>

          <div
            className={`relative z-10 bg-[var(--background)] pt-16 text-[var(--foreground)] selection:bg-[hsl(166_61%_35%/0.22)] lg:pl-64 ${
              fullscreen ? "h-[100dvh] overflow-hidden" : "min-h-screen"
            }`}
          >
            <main className={fullscreen ? "h-full" : undefined}>
              <Outlet />
            </main>
          </div>
        </DocumentProvider>
      </UploadProvider>
    </NotificationToastProvider>
  );
}
