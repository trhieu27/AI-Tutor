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
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#2563eb',
        lineColor: '#94a3b8',
        secondaryColor: '#f59e0b',
        tertiaryColor: '#10b981',
        nodeBorder: '1px',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif'
      },
      securityLevel: 'loose',
      mindmap: {
        useMaxWidth: false,
        padding: 40
      }
    });
  }, []);

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
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-[32px] border border-red-100 max-w-md mx-auto text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl">warning_amber</span>
        </div>
        <h3 className="text-lg font-bold text-red-900 mb-2">Không thể hiển thị sơ đồ</h3>
        <p className="text-sm text-red-700/80 leading-relaxed mb-6">
          Định dạng dữ liệu từ AI hoặc từ việc chỉnh sửa thủ công đang gặp vấn đề về cú pháp.
        </p>
        <div className="flex flex-col gap-2 w-full">
           <p className="text-[11px] text-red-400 font-medium uppercase tracking-widest">Gợi ý khắc phục</p>
           <ul className="text-[11px] text-red-600 space-y-1">
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
