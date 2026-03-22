"use client";

import Link from 'next/link';
import { SIDEBAR_TEXTS } from '@/constants/texts';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-[280px] bg-white h-screen border-r border-outline flex flex-col p-4 shrink-0 overflow-y-auto w-full max-w-[280px]">
      <div className="flex items-start justify-between px-2 pb-8 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-on-surface">{SIDEBAR_TEXTS.brand.title}</h1>
            <p className="text-[10px] text-on-surface-variant font-medium tracking-wider uppercase mt-1">{SIDEBAR_TEXTS.brand.subtitle}</p>
          </div>
        </div>
        {onClose && (
          <button 
            className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface text-on-surface-variant transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container text-primary font-medium">
          <span className="material-symbols-outlined">dashboard</span>
          {SIDEBAR_TEXTS.dashboard}
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-primary-container/50 hover:text-on-surface transition-colors font-medium">
          <span className="material-symbols-outlined">school</span>
          {SIDEBAR_TEXTS.learning}
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-primary-container/50 hover:text-on-surface transition-colors font-medium">
          <span className="material-symbols-outlined">help</span>
          {SIDEBAR_TEXTS.practice}
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-primary-container/50 hover:text-on-surface transition-colors font-medium">
          <span className="material-symbols-outlined">account_tree</span>
          {SIDEBAR_TEXTS.mindmap}
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <button className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm mb-4">
          <span className="material-symbols-outlined text-lg">add</span>
          {SIDEBAR_TEXTS.uploadBtn}
        </button>

        <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-primary-container/50 hover:text-on-surface transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-xl">settings</span>
          {SIDEBAR_TEXTS.settings}
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-primary-container/50 hover:text-on-surface transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-xl">help</span>
          {SIDEBAR_TEXTS.support}
        </Link>
      </div>
    </aside>
  );
}
