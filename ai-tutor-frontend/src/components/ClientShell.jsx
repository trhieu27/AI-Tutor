import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ClientShell({
  children
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return /*#__PURE__*/_jsxs("div", {
    className: "h-screen w-screen overflow-hidden flex bg-surface antialiased relative",
    children: [/*#__PURE__*/_jsx("div", {
      className: "hidden lg:block shrink-0 h-full border-r border-outline/50 bg-white",
      children: /*#__PURE__*/_jsx(Sidebar, {
        onClose: () => {}
      })
    }), isSidebarOpen && /*#__PURE__*/_jsxs("div", {
      className: "fixed inset-0 z-[1000] flex lg:hidden",
      children: [/*#__PURE__*/_jsx("div", {
        className: "absolute inset-0 bg-black/40 backdrop-blur-sm",
        onClick: () => setIsSidebarOpen(false)
      }), /*#__PURE__*/_jsx("div", {
        className: "relative w-[280px] h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200",
        children: /*#__PURE__*/_jsx(Sidebar, {
          onClose: () => setIsSidebarOpen(false)
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex-1 flex flex-col min-w-0 h-full overflow-hidden w-full relative",
      children: [/*#__PURE__*/_jsx("div", {
        className: "z-[100] relative",
        children: /*#__PURE__*/_jsx(Header, {
          onMenuClick: () => setIsSidebarOpen(true)
        })
      }), /*#__PURE__*/_jsx("main", {
        className: "flex-1 overflow-x-hidden overflow-y-auto w-full bg-surface",
        children: children
      })]
    })]
  });
}