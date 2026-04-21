"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HELP_PAGE_TEXTS } from '@/constants/texts';

// ── Types ──────────────────────────────────────────────────────────────────────
type TabId = 'faq' | 'guide' | 'contact';

// ── Animated Height Component ──────────────────────────────────────────────────
function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setHeight(open ? ref.current.scrollHeight : 0);
    }
  }, [open, children]);

  return (
    <div
      style={{ height, opacity: open ? 1 : 0 }}
      className="overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

// ── Toast Component ────────────────────────────────────────────────────────────
function Toast({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-500">
      <div className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-600/30 border border-emerald-400/30">
        <span className="material-symbols-outlined text-lg">check_circle</span>
        <span className="text-sm font-normal">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/10 rounded-lg p-1 transition-colors">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}

// ── Data from constants ────────────────────────────────────────────────────────
const T = HELP_PAGE_TEXTS;

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'faq', label: T.tabs.faq, icon: 'quiz' },
  { id: 'guide', label: T.tabs.guide, icon: 'menu_book' },
  { id: 'contact', label: T.tabs.contact, icon: 'support_agent' },
];

const faqs = T.faq.items;
const guideSteps = T.guide.steps;

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabId>('faq');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeGuide, setActiveGuide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [formErrors, setFormErrors] = useState<{ subject?: string; message?: string }>({});
  const [showToast, setShowToast] = useState(false);
  const [faqCategory, setFaqCategory] = useState<string>(T.faq.allCategory);

  // Derive unique FAQ categories
  const faqCategories = [T.faq.allCategory, ...Array.from(new Set(faqs.map(f => f.category)))];

  // Filter FAQs by search + category
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = faqCategory === T.faq.allCategory || faq.category === faqCategory;
    return matchesSearch && matchesCategory;
  });

  // Contact form handler
  const handleContactSubmit = useCallback(() => {
    const errors: { subject?: string; message?: string } = {};
    if (!contactForm.subject.trim()) errors.subject = T.contact.errors.subjectRequired;
    if (!contactForm.message.trim()) errors.message = T.contact.errors.messageRequired;
    else if (contactForm.message.trim().length < 20) errors.message = T.contact.errors.messageMinLength;
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Simulate submit
    setShowToast(true);
    setContactForm({ subject: '', message: '' });
    setFormErrors({});
  }, [contactForm]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 pb-24 relative z-10 transition-colors duration-500 font-[Inter,sans-serif]">
      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-indigo-500/20 dark:border-white/10 rounded-[36px] md:rounded-[48px] p-8 md:p-14 text-white shadow-xl dark:shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-white/10 dark:bg-indigo-500/15 blur-[100px] md:blur-[130px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-pink-500/10 dark:bg-purple-500/15 blur-[80px] md:blur-[100px] rounded-full pointer-events-none"></div>
        
        {/* Floating icons */}
        <div className="absolute top-8 right-10 opacity-10 dark:opacity-5 hidden md:block">
          <span className="material-symbols-outlined text-[80px] text-white rotate-12">help</span>
        </div>
        <div className="absolute bottom-6 right-28 opacity-10 dark:opacity-5 hidden md:block">
          <span className="material-symbols-outlined text-[50px] text-white -rotate-12">support_agent</span>
        </div>

        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-indigo-500/10 border border-white/20 dark:border-indigo-500/30 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-normal text-white/90 dark:text-indigo-300 tracking-wide leading-none">
              {T.hero.badge}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] text-white">
            {T.hero.title}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-indigo-200 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300">
              {T.hero.titleHighlight}
            </span>
          </h1>
          <p className="text-white/75 dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-xl font-normal">
            {T.hero.subtitle}
          </p>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-500">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl text-xs md:text-[13px] font-medium transition-all duration-300 flex-1 min-w-fit justify-center ${
              activeTab === tab.id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <span 
              className={`material-symbols-outlined text-[16px] md:text-lg transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`}
              style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="min-h-[500px]">

        {/* ▸ FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={T.faq.searchPlaceholder}
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-normal text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all duration-300"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {faqCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFaqCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                      faqCategory === cat
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                        : 'bg-white dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">search_off</span>
                  <p className="text-sm font-normal text-slate-400 dark:text-slate-500">
                    {T.faq.noResults} &quot;{searchQuery}&quot;
                  </p>
                  <button onClick={() => { setSearchQuery(''); setFaqCategory(T.faq.allCategory); }} className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
                    {T.faq.clearFilter}
                  </button>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const actualIndex = faqs.indexOf(faq);
                  const isOpen = activeFaq === actualIndex;
                  return (
                    <div
                      key={actualIndex}
                      className={`rounded-2xl md:rounded-3xl border transition-all duration-300 overflow-hidden ${
                        isOpen
                          ? 'border-indigo-500/40 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-500/5 dark:to-purple-500/5 shadow-lg shadow-indigo-500/5'
                          : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md'
                      }`}
                    >
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : actualIndex)}
                        className="w-full px-5 md:px-6 py-4 md:py-5 flex items-center gap-4 text-left group"
                      >
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isOpen
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500'
                        }`}>
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 300" }}>
                            {faq.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[13px] md:text-[14px] font-medium transition-colors block ${
                            isOpen ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                          }`}>
                            {faq.question}
                          </span>
                          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5 block">
                            {faq.category}
                          </span>
                        </div>
                        <span className={`material-symbols-outlined text-xl shrink-0 transition-all duration-300 ${
                          isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-300 dark:text-slate-600'
                        }`}>
                          expand_more
                        </span>
                      </button>

                      <AnimatedCollapse open={isOpen}>
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                          <div className="h-px bg-indigo-200/50 dark:bg-indigo-500/10 mb-4 ml-14"></div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-[1.8] font-normal ml-14">
                            {faq.answer}
                          </p>
                        </div>
                      </AnimatedCollapse>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ▸ Guide Tab */}
        {activeTab === 'guide' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Step List */}
              <div className="lg:col-span-2 space-y-2">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide mb-4 px-1">
                  {T.guide.stepsLabel}
                </p>
                {guideSteps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveGuide(idx)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left group ${
                      activeGuide === idx
                        ? 'bg-white dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                        : 'border border-transparent hover:bg-white/80 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      activeGuide === idx
                        ? `bg-gradient-to-br ${step.color} text-white shadow-lg`
                        : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 group-hover:scale-105'
                    }`}>
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 300" }}>
                        {step.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-colors ${
                        activeGuide === idx ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        <span className="text-indigo-400 dark:text-indigo-500 mr-1.5">{String(idx + 1).padStart(2, '0')}</span>
                        {step.title}
                      </p>
                    </div>
                    {activeGuide === idx && (
                      <span className="material-symbols-outlined text-indigo-500 text-sm shrink-0">arrow_forward</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Step Detail */}
              <div className="lg:col-span-3">
                <div className="sticky top-8">
                  <div 
                    key={activeGuide}
                    className="relative overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[32px] p-8 md:p-10 shadow-lg dark:shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500"
                  >
                    {/* Background decoration */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${guideSteps[activeGuide].color} opacity-5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2`}></div>
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${guideSteps[activeGuide].color} flex items-center justify-center text-white shadow-xl`}>
                          <span className="material-symbols-outlined text-2xl">{guideSteps[activeGuide].icon}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-indigo-500 tracking-wide mb-1">
                            {T.guide.stepLabel} {activeGuide + 1} / {guideSteps.length}
                          </p>
                          <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            {guideSteps[activeGuide].title}
                          </h3>
                        </div>
                      </div>

                      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-[1.8] font-normal">
                        {guideSteps[activeGuide].description}
                      </p>

                      {/* Progress dots */}
                      <div className="flex items-center gap-2 pt-4">
                        {guideSteps.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveGuide(idx)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              idx === activeGuide
                                ? 'bg-indigo-500 w-8'
                                : idx < activeGuide
                                  ? 'bg-indigo-300 dark:bg-indigo-700 w-3'
                                  : 'bg-slate-200 dark:bg-slate-700 w-3'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setActiveGuide(Math.max(0, activeGuide - 1))}
                          disabled={activeGuide === 0}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_back</span>
                          {T.guide.prevButton}
                        </button>
                        <button
                          onClick={() => setActiveGuide(Math.min(guideSteps.length - 1, activeGuide + 1))}
                          disabled={activeGuide === guideSteps.length - 1}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                          {T.guide.nextButton}
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ▸ Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            {/* Contact Form */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8">
              <h3 className="text-base font-medium text-slate-900 dark:text-white mb-1">{T.contact.formTitle}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mb-6">{T.contact.formSubtitle}</p>

              <div className="space-y-4">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-0.5">
                    {T.contact.subjectLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => {
                      setContactForm(prev => ({ ...prev, subject: e.target.value }));
                      if (formErrors.subject) setFormErrors(prev => ({ ...prev, subject: undefined }));
                    }}
                    placeholder={T.contact.subjectPlaceholder}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border text-sm font-normal text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                      formErrors.subject
                        ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/10'
                        : 'border-slate-200 dark:border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/40'
                    }`}
                  />
                  {formErrors.subject && (
                    <p className="text-[11px] text-rose-500 font-normal ml-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {formErrors.subject}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-0.5">
                    {T.contact.messageLabel} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => {
                      setContactForm(prev => ({ ...prev, message: e.target.value }));
                      if (formErrors.message) setFormErrors(prev => ({ ...prev, message: undefined }));
                    }}
                    placeholder={T.contact.messagePlaceholder}
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border text-sm font-normal text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 transition-all resize-none ${
                      formErrors.message
                        ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/10'
                        : 'border-slate-200 dark:border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/40'
                    }`}
                  />
                  <div className="flex justify-between items-center">
                    {formErrors.message ? (
                      <p className="text-[11px] text-rose-500 font-normal ml-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        {formErrors.message}
                      </p>
                    ) : <span />}
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-normal">
                      {contactForm.message.length} {T.contact.charCount}
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleContactSubmit}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  {T.contact.submitButton}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      <Toast
        message={T.contact.successToast}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
