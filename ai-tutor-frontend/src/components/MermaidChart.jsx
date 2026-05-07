import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const MermaidChart = ({
  chart
}) => {
  const [svg, setSvg] = useState('');
  const [isError, setIsError] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      themeVariables: {
        primaryColor: isDark ? '#6366f1' : '#4f46e5',
        primaryTextColor: '#fff',
        primaryBorderColor: 'transparent',
        lineColor: isDark ? '#6366f1' : '#4f46e5',
        secondaryColor: '#f59e0b',
        tertiaryColor: '#10b981',
        nodeBorder: '0px',
        fontSize: '13px',
        fontFamily: 'Outfit, Inter, sans-serif',
        // Mindmap specific adjustments for organic feel
        cType10: isDark ? '#818cf8' : '#6366f1',
        // Root edge
        cType1: isDark ? '#fb7185' : '#f43f5e',
        cType2: isDark ? '#38bdf8' : '#0ea5e9',
        cType3: isDark ? '#4ade80' : '#22c55e',
        cType4: isDark ? '#fbbf24' : '#f59e0b',
        edgeColor1: isDark ? '#818cf8' : '#6366f1'
      },
      securityLevel: 'loose',
      mindmap: {
        useMaxWidth: false,
        padding: 50,
        maxNodeWidth: 220
      }
    });

    // Injected CSS for organic "tree" look
    const styleId = 'mermaid-tree-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      .mermaid-container svg {
        filter: drop-shadow(0 10px 30px rgba(0,0,0,0.05));
      }
      .mindmap-node rect {
        rx: 16px !important;
        ry: 16px !important;
        stroke-width: 0px !important;
        transition: all 0.3s ease;
      }
      .mindmap-node:hover rect {
        filter: brightness(1.1);
      }
      path.mindmap-edge {
        stroke-width: 4px !important;
        stroke-linecap: round !important;
        stroke-opacity: 0.5 !important;
        transition: all 0.3s ease;
      }
      .mindmap-node text {
        font-weight: 700 !important;
      }
      /* Root node styling */
      .mindmap-node--root rect {
        rx: 100px !important;
        ry: 100px !important;
        fill: ${isDark ? '#6366f1' : '#4338ca'} !important;
      }
    `;

    // Re-render when theme changes (optional but good for consistency)
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          const updatedIsDark = document.documentElement.classList.contains('dark');
          mermaid.initialize({
            theme: updatedIsDark ? 'dark' : 'default',
            themeVariables: {
              primaryColor: updatedIsDark ? '#6366f1' : '#4f46e5',
              primaryTextColor: '#fff',
              primaryBorderColor: 'transparent',
              lineColor: updatedIsDark ? '#6366f1' : '#4f46e5'
            }
          });
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true
    });
    return () => observer.disconnect();
  }, [chart]);
  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      setIsError(false);
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      try {
        // Kiểm tra tính hợp lệ của mã trước khi render
        await mermaid.parse(chart);
        const {
          svg: svgCode
        } = await mermaid.render(id, chart);
        setSvg(svgCode);
      } catch (err) {
        console.error("❌ Mermaid Render Error:", err);
        setIsError(true);
        // Khi lỗi, mermaid có thể để lại rác trong DOM, ta dọn dẹp nếu cần
        const tempElement = document.getElementById(`d${id}`);
        if (tempElement) tempElement.remove();
      }
    };
    renderChart();
  }, [chart]);
  if (isError) {
    // Nếu không phải là định dạng mindmap mà bị lỗi parse, có thể đây là một thông báo lỗi từ hệ thống
    if (!chart.toLowerCase().includes('mindmap') && chart.length > 0) {
      return /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-white/20",
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined text-3xl",
            children: "info"
          })
        }), /*#__PURE__*/_jsx("p", {
          className: "text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed",
          children: chart
        })]
      });
    }
    return /*#__PURE__*/_jsxs("div", {
      className: "flex flex-col items-center justify-center p-12 bg-red-50/50 dark:bg-red-500/5 rounded-[32px] border border-red-100 dark:border-red-500/10 max-w-md mx-auto text-center animate-in fade-in zoom-in duration-300",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined text-3xl",
          children: "warning_amber"
        })
      }), /*#__PURE__*/_jsx("h3", {
        className: "text-lg font-bold text-red-900 dark:text-red-300 mb-2",
        children: "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB s\u01A1 \u0111\u1ED3"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-red-700/80 dark:text-red-400/60 leading-relaxed mb-6",
        children: "\u0110\u1ECBnh d\u1EA1ng d\u1EEF li\u1EC7u t\u1EEB AI ho\u1EB7c t\u1EEB vi\u1EC7c ch\u1EC9nh s\u1EEDa th\u1EE7 c\xF4ng \u0111ang g\u1EB7p v\u1EA5n \u0111\u1EC1 v\u1EC1 c\xFA ph\xE1p."
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col gap-2 w-full",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-[11px] text-red-400 dark:text-red-500/60 font-medium uppercase tracking-widest",
          children: "G\u1EE3i \xFD kh\u1EAFc ph\u1EE5c"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "text-[11px] text-red-600 dark:text-red-400/80 space-y-1",
          children: [/*#__PURE__*/_jsx("li", {
            children: "\u2022 Ki\u1EC3m tra l\u1EA1i c\xE1c d\u1EA5u ngo\u1EB7c l\u1ED3ng nhau"
          }), /*#__PURE__*/_jsx("li", {
            children: "\u2022 \u0110\u1EA3m b\u1EA3o c\xE1c \xFD con \u0111\u01B0\u1EE3c th\u1EE5t l\u1EC1 b\u1EB1ng d\u1EA5u c\xE1ch"
          }), /*#__PURE__*/_jsx("li", {
            children: "\u2022 Nh\u1EA5n \"L\xE0m m\u1EDBi t\u1EEB AI\" \u0111\u1EC3 th\u1EED l\u1EA1i"
          })]
        })]
      })]
    });
  }
  return /*#__PURE__*/_jsx("div", {
    ref: containerRef,
    className: "mermaid-container flex justify-center w-full",
    dangerouslySetInnerHTML: {
      __html: svg
    }
  });
};
export default MermaidChart;