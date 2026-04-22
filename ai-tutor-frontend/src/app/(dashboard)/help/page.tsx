"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { HELP_PAGE_TEXTS } from "@/constants/texts";

import { authFetch } from "@/services/api.service";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

type TabId = "faq" | "guide" | "contact";

/* ── Animated collapse ────────────────────────────────────────────────────── */
function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) setHeight(open ? ref.current.scrollHeight : 0);
  }, [open, children]);
  return (
    <div style={{ height, opacity: open ? 1 : 0 }} className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* ── Toast ────────────────────────────────────────────────────────────────── */
function Toast({ show, message, onClose }: { show: boolean; message: string; onClose: () => void }) {
  useEffect(() => {
    if (show) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [show, onClose]);
  if (!show) return null;
  return (
    <div className="fixed bottom-8 right-8 z-[200] animate-dialog-enter">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-[hsl(158_64%_30%)] text-white rounded-2xl shadow-xl border border-[hsl(158_64%_44%/0.30)]">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
        <span className="text-[13px] font-semibold">{message}</span>
        <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────────────────── */
const T = HELP_PAGE_TEXTS;
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "faq",     label: T.tabs.faq,     icon: "quiz" },
  { id: "guide",   label: T.tabs.guide,   icon: "menu_book" },
  { id: "contact", label: T.tabs.contact, icon: "support_agent" },
];
const faqs      = T.faq.items;
const guideSteps = T.guide.steps;

/* ══════════════════════════════════════════════════════════════════════════ */
export default function HelpPage() {
  const [activeTab,    setActiveTab]    = useState<TabId>("faq");
  const [activeFaq,    setActiveFaq]    = useState<number | null>(null);
  const [activeGuide,  setActiveGuide]  = useState(0);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [faqCategory,  setFaqCategory]  = useState(T.faq.allCategory);
  const [contactForm,  setContactForm]  = useState({ subject: "", message: "" });
  const [formErrors,   setFormErrors]   = useState<{ subject?: string; message?: string }>({});
  const [showToast,    setShowToast]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const faqCategories  = [T.faq.allCategory, ...Array.from(new Set(faqs.map(f => f.category)))];
  const filteredFaqs   = faqs.filter(f => {
    const q = searchQuery.toLowerCase();
    return (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
        && (faqCategory === T.faq.allCategory || f.category === faqCategory);
  });

  const handleSubmit = useCallback(async () => {
    const errs: typeof formErrors = {};
    if (!contactForm.subject.trim())          errs.subject = T.contact.errors.subjectRequired;
    if (!contactForm.message.trim())          errs.message = T.contact.errors.messageRequired;
    else if (contactForm.message.length < 20) errs.message = T.contact.errors.messageMinLength;
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await authFetch(`${API}/users/support`, {
        method: "POST",
        body: JSON.stringify({ subject: contactForm.subject, message: contactForm.message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gửi thất bại, vui lòng thử lại");
      }
      setShowToast(true);
      setContactForm({ subject: "", message: "" });
      setFormErrors({});
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [contactForm]);

  /* ── input shared styles ──────────────────────────────────────────────── */
  const inputCls = "w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all";
  const inputErrCls = "w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[hsl(343_85%_58%/0.50)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(343_72%_48%/0.20)] transition-all";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h1 className="font-display text-[28px] font-semibold text-[var(--foreground)] tracking-tight">Trợ giúp</h1>
          <p className="text-[13px] text-[var(--muted)]">Câu hỏi thường gặp, hướng dẫn sử dụng và liên hệ hỗ trợ</p>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-2xl border border-[var(--border-color)]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-[var(--card-bg)] text-[hsl(239_55%_50%)] shadow-sm border border-[var(--border-color)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div key={activeTab} className="animate-dialog-enter min-h-[480px]">

          {/* ▸ FAQ ─────────────────────────────────────────────────────────── */}
          {activeTab === "faq" && (
            <div className="space-y-5">
              {/* Search + categories */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder={T.faq.searchPlaceholder}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {faqCategories.map(cat => (
                    <button key={cat} onClick={() => setFaqCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                        faqCategory === cat
                          ? "bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] border border-[hsl(239_68%_58%/0.25)]"
                          : "bg-[var(--card-bg)] text-[var(--muted)] border border-[var(--border-color)] hover:text-[var(--foreground)]"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ list */}
              <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="material-symbols-outlined text-[40px] text-[var(--muted)]">search_off</span>
                    <p className="text-[13px] text-[var(--muted)]">Không tìm thấy kết quả cho "{searchQuery}"</p>
                    <button onClick={() => { setSearchQuery(""); setFaqCategory(T.faq.allCategory); }}
                      className="text-[12px] font-semibold text-[hsl(239_55%_50%)] hover:underline">{T.faq.clearFilter}</button>
                  </div>
                ) : filteredFaqs.map(faq => {
                  const idx = faqs.indexOf(faq);
                  const open = activeFaq === idx;
                  return (
                    <div key={idx} className={`rounded-2xl border transition-all overflow-hidden ${open ? "border-[hsl(239_68%_58%/0.30)] bg-[hsl(239_68%_58%/0.04)]" : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[hsl(239_68%_58%/0.20)]"}`}>
                      <button onClick={() => setActiveFaq(open ? null : idx)} className="w-full px-5 py-4 flex items-center gap-4 text-left group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${open ? "bg-[hsl(239_68%_58%)] text-white" : "bg-[var(--surface)] text-[var(--muted)] group-hover:text-[hsl(239_55%_50%)]"}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17, fontVariationSettings: "'wght' 300" }}>{faq.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold ${open ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)] group-hover:text-[hsl(239_55%_50%)]"} transition-colors`}>{faq.question}</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">{faq.category}</p>
                        </div>
                        <span className={`material-symbols-outlined text-[var(--muted)] transition-transform duration-300 ${open ? "rotate-180 text-[hsl(239_55%_50%)]" : ""}`} style={{ fontSize: 18 }}>expand_more</span>
                      </button>
                      <AnimatedCollapse open={open}>
                        <div className="px-5 pb-5">
                          <div className="h-px bg-[var(--border-subtle)] mb-4 ml-[52px]" />
                          <p className="text-[13px] text-[var(--muted)] leading-[1.7] ml-[52px]">{faq.answer}</p>
                        </div>
                      </AnimatedCollapse>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ▸ Guide ───────────────────────────────────────────────────────── */}
          {activeTab === "guide" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Step list */}
              <div className="lg:col-span-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{T.guide.stepsLabel}</p>
                {guideSteps.map((step, idx) => (
                  <button key={idx} onClick={() => setActiveGuide(idx)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left ${
                      activeGuide === idx
                        ? "bg-[var(--card-bg)] border border-[hsl(239_68%_58%/0.25)] shadow-sm"
                        : "border border-transparent hover:bg-[var(--surface)]"
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${activeGuide === idx ? `bg-gradient-to-br ${step.color} text-white shadow-md` : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{step.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${activeGuide === idx ? "text-[var(--foreground)]" : "text-[var(--muted)]"} transition-colors`}>
                        <span className="text-[hsl(239_55%_50%)] mr-1.5">{String(idx + 1).padStart(2, "0")}</span>
                        {step.title}
                      </p>
                    </div>
                    {activeGuide === idx && <span className="material-symbols-outlined text-[hsl(239_55%_50%)] shrink-0" style={{ fontSize: 16 }}>arrow_forward</span>}
                  </button>
                ))}
              </div>

              {/* Step detail */}
              <div className="lg:col-span-3">
                <div key={activeGuide} className="animate-dialog-enter p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${guideSteps[activeGuide].color} flex items-center justify-center text-white shadow-lg`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{guideSteps[activeGuide].icon}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[hsl(239_55%_50%)] mb-0.5">{T.guide.stepLabel} {activeGuide + 1} / {guideSteps.length}</p>
                      <h3 className="font-display text-[18px] font-semibold text-[var(--foreground)] tracking-tight">{guideSteps[activeGuide].title}</h3>
                    </div>
                  </div>
                  <p className="text-[13px] text-[var(--muted)] leading-[1.75]">{guideSteps[activeGuide].description}</p>

                  {/* Progress */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {guideSteps.map((_, i) => (
                      <button key={i} onClick={() => setActiveGuide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeGuide ? "bg-[hsl(239_68%_58%)] w-8" : i < activeGuide ? "bg-[hsl(239_68%_58%/0.35)] w-3" : "bg-[var(--border-color)] w-3"}`}
                      />
                    ))}
                  </div>

                  {/* Nav buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <button onClick={() => setActiveGuide(Math.max(0, activeGuide - 1))} disabled={activeGuide === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--muted)] border border-[var(--border-color)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                      {T.guide.prevButton}
                    </button>
                    <button onClick={() => setActiveGuide(Math.min(guideSteps.length - 1, activeGuide + 1))} disabled={activeGuide === guideSteps.length - 1}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-[hsl(239_68%_58%)] text-white hover:bg-[hsl(239_55%_50%)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">
                      {T.guide.nextButton}
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ▸ Contact ─────────────────────────────────────────────────────── */}
          {activeTab === "contact" && (
            <div className="max-w-lg mx-auto">
              <div className="p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-5">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{T.contact.formTitle}</h3>
                  <p className="text-[12px] text-[var(--muted)] mt-0.5">{T.contact.formSubtitle}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                      {T.contact.subjectLabel} <span className="text-[hsl(343_72%_48%)]">*</span>
                    </label>
                    <input
                      value={contactForm.subject}
                      onChange={e => { setContactForm(p => ({ ...p, subject: e.target.value })); if (formErrors.subject) setFormErrors(p => ({ ...p, subject: undefined })); }}
                      placeholder={T.contact.subjectPlaceholder}
                      className={formErrors.subject ? inputErrCls : inputCls}
                    />
                    {formErrors.subject && <p className="text-[11px] text-[hsl(343_72%_48%)] mt-1 flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{formErrors.subject}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                      {T.contact.messageLabel} <span className="text-[hsl(343_72%_48%)]">*</span>
                    </label>
                    <textarea
                      value={contactForm.message} rows={5}
                      onChange={e => { setContactForm(p => ({ ...p, message: e.target.value })); if (formErrors.message) setFormErrors(p => ({ ...p, message: undefined })); }}
                      placeholder={T.contact.messagePlaceholder}
                      className={`${formErrors.message ? inputErrCls : inputCls} resize-none`}
                    />
                    <div className="flex justify-between mt-1">
                      {formErrors.message
                        ? <p className="text-[11px] text-[hsl(343_72%_48%)] flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{formErrors.message}</p>
                        : <span />}
                      <p className="text-[10px] text-[var(--muted)]">{contactForm.message.length} {T.contact.charCount}</p>
                    </div>
                  </div>

                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>send</span>
                        {T.contact.submitButton}
                      </>
                    )}
                  </button>
                  {submitError && (
                    <p className="text-[12px] text-[hsl(343_72%_48%)] flex items-center gap-1.5 font-semibold">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast show={showToast} message={T.contact.successToast} onClose={() => setShowToast(false)} />
    </div>
  );
}
