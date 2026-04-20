"use client";

import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        cType10: isDark ? '#818cf8' : '#6366f1', // Root edge
        cType1: isDark ? '#fb7185' : '#f43f5e',
        cType2: isDark ? '#38bdf8' : '#0ea5e9',
        cType3: isDark ? '#4ade80' : '#22c55e',
        cType4: isDark ? '#fbbf24' : '#f59e0b',
        edgeColor1: isDark ? '#818cf8' : '#6366f1',
      },
      securityLevel: 'loose',
      mindmap: {
        useMaxWidth: false,
        padding: 50,
        maxNodeWidth: 220,
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
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const updatedIsDark = document.documentElement.classList.contains('dark');
          mermaid.initialize({
            theme: updatedIsDark ? 'dark' : 'default',
            themeVariables: {
              primaryColor: updatedIsDark ? '#6366f1' : '#4f46e5',
              primaryTextColor: '#fff',
              primaryBorderColor: 'transparent',
              lineColor: updatedIsDark ? '#6366f1' : '#4f46e5',
            }
          });
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
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
        
        const { svg: svgCode } = await mermaid.render(id, chart);
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
      return (
        <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
           <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-white/20">
             <span className="material-symbols-outlined text-3xl">info</span>
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed">
             {chart}
           </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50/50 dark:bg-red-500/5 rounded-[32px] border border-red-100 dark:border-red-500/10 max-w-md mx-auto text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl">warning_amber</span>
        </div>
        <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">Không thể hiển thị sơ đồ</h3>
        <p className="text-sm text-red-700/80 dark:text-red-400/60 leading-relaxed mb-6">
          Định dạng dữ liệu từ AI hoặc từ việc chỉnh sửa thủ công đang gặp vấn đề về cú pháp.
        </p>
        <div className="flex flex-col gap-2 w-full">
           <p className="text-[11px] text-red-400 dark:text-red-500/60 font-medium uppercase tracking-widest">Gợi ý khắc phục</p>
           <ul className="text-[11px] text-red-600 dark:text-red-400/80 space-y-1">
             <li>• Kiểm tra lại các dấu ngoặc lồng nhau</li>
             <li>• Đảm bảo các ý con được thụt lề bằng dấu cách</li>
             <li>• Nhấn "Làm mới từ AI" để thử lại</li>
           </ul>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="mermaid-container flex justify-center w-full"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default MermaidChart;
