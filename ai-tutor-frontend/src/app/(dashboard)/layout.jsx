import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { UploadProvider } from '@/context/UploadContext';
import { DocumentProvider } from '@/context/DocumentContext';
import { NotificationToastProvider } from '@/components/NotificationToast';

/**
 * ─── iOS 26 Safari Address Bar — Architecture Notes ─────────────────────────
 *
 * Safari shrinks its address bar ONLY when window (document) scrolls.
 * Inner div scroll (overflow-y:auto) cannot trigger this — WebKit limitation.
 *
 * There is NO JavaScript API to fake this:
 *   - window.scrollBy() from JS is ignored by Safari for toolbar behavior
 *   - WheelEvent/TouchMove forwarding doesn't trigger native toolbar animation
 *
 * Solution: Route-based layout strategy
 *   • Regular pages (/, /learning, /practice…): window scroll → bar shrinks ✅
 *   • Full-screen pages (/chat/…, /mindmap): lock window scroll, own container ✅
 *
 * Implementation:
 *   - Default layout: min-h-[100dvh], no overflow-hidden → window scrolls freely
 *   - Full-screen routes: add class "layout-fullscreen" to html → overflow:hidden
 * ────────────────────────────────────────────────────────────────────────────
 */

// Pages that need full-screen fixed layout (own inner scroll, no window scroll)
const FULLSCREEN_ROUTES = ['/chat', '/mindmap/'];

function isFullscreen(pathname) {
  return FULLSCREEN_ROUTES.some(r => pathname.startsWith(r));
}

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const fullscreen = isFullscreen(location.pathname);

  useEffect(() => {
    setIsSidebarOpen(false);

    // Always reset scroll position first — prevents content being hidden above
    // viewport when navigating from a scrolled page to a fullscreen page
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (fullscreen) {
      // Full-screen mode: lock window scroll so only inner containers scroll
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Window scroll mode: Safari address bar can shrink
      document.documentElement.style.overflow = '';
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.style.overflow = '';
    };
  }, [location.pathname, fullscreen]);

  return (
    <NotificationToastProvider>
      <UploadProvider>
        <DocumentProvider>

          {/* Mobile sidebar backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar — fixed */}
          <div className={`fixed inset-y-0 left-0 z-[60] w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* Header — fixed top, GPU-promoted to prevent iOS scroll jitter */}
          <div
            className="fixed top-0 left-0 right-0 z-40 lg:pl-64"
            style={{ transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden' }}
          >
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
          </div>

          {/* Ambient glow — dark mode only */}
          <div className="fixed inset-0 z-0 opacity-0 dark:opacity-30 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[150px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[150px] rounded-full" />
          </div>

          {/*
            Content wrapper:
            - Regular pages: min-h-[100dvh] → window scrolls → Safari bar shrinks
            - Full-screen  : h-[100dvh] + overflow-hidden → inner scroll only
          */}
          <div
            className={`relative z-10 lg:pl-64 pt-16 bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30 transition-colors duration-500 ${fullscreen
              ? 'h-[100dvh] overflow-hidden'
              : 'min-h-[100dvh]'
              }`}
          >
            <main className={fullscreen ? 'h-full' : undefined}>
              <Outlet />
            </main>
          </div>

        </DocumentProvider>
      </UploadProvider>
    </NotificationToastProvider>
  );
}