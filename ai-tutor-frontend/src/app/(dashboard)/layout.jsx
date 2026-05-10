import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { UploadProvider } from '@/context/UploadContext';
import { DocumentProvider } from '@/context/DocumentContext';
import { NotificationToastProvider } from '@/components/NotificationToast';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);
  return /*#__PURE__*/_jsx(NotificationToastProvider, {
    children: /*#__PURE__*/_jsx(UploadProvider, {
      children: /*#__PURE__*/_jsx(DocumentProvider, {
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex w-full bg-[var(--background)] text-[var(--foreground)] h-svh overflow-hidden selection:bg-indigo-500/30 transition-colors duration-500",
          children: [isSidebarOpen && /*#__PURE__*/_jsx("div", {
            className: "fixed inset-0 bg-black/80 backdrop-blur-md z-[55] lg:hidden",
            onClick: () => setIsSidebarOpen(false)
          }), /*#__PURE__*/_jsx("div", {
            className: `fixed inset-y-0 left-0 z-[60] w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`,
            children: /*#__PURE__*/_jsx(Sidebar, {
              onClose: () => setIsSidebarOpen(false)
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1 flex flex-col min-w-0 h-full relative bg-[var(--background)] lg:pl-64",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "fixed inset-0 z-0 opacity-0 dark:opacity-30 pointer-events-none transition-opacity duration-500",
              children: [/*#__PURE__*/_jsx("div", {
                className: "absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[150px] rounded-full"
              }), /*#__PURE__*/_jsx("div", {
                className: "absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[150px] rounded-full"
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "shrink-0",
              children: /*#__PURE__*/_jsx(Header, {
                onMenuClick: () => setIsSidebarOpen(true)
              })
            }), /*#__PURE__*/_jsx("main", {
              className: "flex-1 overflow-y-auto relative w-full",
              children: /*#__PURE__*/_jsx(Outlet, {})
            })]
          })]
        })
      })
    })
  });
}