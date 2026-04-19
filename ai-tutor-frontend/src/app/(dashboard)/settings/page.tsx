"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { HEADER_TEXTS, SIDEBAR_TEXTS } from '@/constants/texts';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const sections = [
    {
      id: 'profile',
      title: 'Hồ sơ cá nhân',
      icon: 'person',
      description: 'Quản lý thông tin tài khoản và cách bạn hiển thị trên hệ thống.',
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">
              {(user?.full_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{user?.full_name || user?.username || "Người dùng"}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-3">{user?.email}</p>
              <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                Thay đổi ảnh đại diện
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
              <input 
                type="text" 
                defaultValue={user?.full_name || ""} 
                placeholder="Nhập họ tên của bạn..."
                className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all text-sm font-bold placeholder-slate-400 dark:placeholder-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
              <input 
                type="text" 
                defaultValue={user?.username || ""} 
                readOnly
                className="w-full px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-500 text-sm font-bold cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'appearance',
      title: 'Giao diện & Trải nghiệm',
      icon: 'palette',
      description: 'Tùy chỉnh màu sắc và cách ứng dụng hiển thị trên thiết bị của bạn.',
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setTheme('light')}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${theme === 'light' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${theme === 'light' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <span className="material-symbols-outlined text-2xl">light_mode</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black dark:text-white">Chế độ sáng</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Light Minimalist</p>
                </div>
              </button>

              <button 
                onClick={() => setTheme('dark')}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <span className="material-symbols-outlined text-2xl">dark_mode</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black dark:text-white">Chế độ tối</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Luxury Indigo</p>
                </div>
              </button>
           </div>

           <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
              <span className="material-symbols-outlined text-amber-500">info</span>
              <div>
                <p className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Mẹo nhỏ</p>
                <p className="text-xs text-amber-800 dark:text-amber-200/70 font-medium leading-relaxed">
                  Chuyển sang Chế độ tối khi sử dụng vào ban đêm để bảo vệ mắt và tiết kiệm pin cho thiết bị của bạn.
                </p>
              </div>
           </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 pb-24 relative z-10 transition-colors duration-500">
      {/* Header section */}
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Cài đặt hệ thống</h2>
        <div className="flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]"></span>
           <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Tùy chỉnh tài khoản và giao diện theo ý thích của bạn</p>
        </div>
      </div>

      <div className="space-y-16">
        {sections.map((section) => (
          <div key={section.id} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <span className="material-symbols-outlined text-xl">{section.icon}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{section.title}</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed pr-4">
                {section.description}
              </p>
            </div>

            <div className="lg:col-span-2">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      {/* Footer sticky bar */}
      <div className="fixed bottom-8 right-8 lg:right-12 z-50 animate-in fade-in slide-in-from-right-10 duration-700">
        <button className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/20">
          <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">save</span>
          LƯU THAY ĐỔI
        </button>
      </div>
    </div>
  );
}
