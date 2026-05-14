import { useCallback, useMemo, useState } from "react";
import { authFetch } from "@/services/api.service";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import { PageFrame, PageHeader, SegmentedControl, Surface } from "@/components/ui/Premium";
import { HELP_WORKSPACE_TEXTS } from "@/constants/texts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1";
const T = HELP_WORKSPACE_TEXTS;

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[200] rounded-[var(--radius-panel)] border border-[var(--success-border)] bg-[var(--card-bg)] px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[18px] text-[var(--brand-success)]">check_circle</span>
        <p className="text-[13px] font-semibold text-[var(--foreground)]">{message}</p>
        <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]" aria-label={T.toast.closeAria}>
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState("guide");
  const [openFaq, setOpenFaq] = useState(0);
  const [query, setQuery] = useState("");
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    return T.faq.filter(([question, answer]) => !q || question.toLowerCase().includes(q) || answer.toLowerCase().includes(q));
  }, [query]);

  const submitSupport = useCallback(() => {
    const nextErrors = {};
    if (!contactForm.subject.trim()) nextErrors.subject = T.validation.subjectRequired;
    if (!contactForm.message.trim()) nextErrors.message = T.validation.messageRequired;
    else if (contactForm.message.trim().length < 20) nextErrors.message = T.validation.messageMinLength;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = { subject: contactForm.subject.trim(), message: contactForm.message.trim() };
    setContactForm({ subject: "", message: "" });
    setToast(T.toast.success);
    authFetch(`${API}/users/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [contactForm]);

  return (
    <>
      <PageFrame className="space-y-6" narrow>
        <PageHeader
          icon="support_agent"
          title={T.header.title}
          subtitle={T.header.subtitle}
          actions={
            <>
              <Button to="/learning" variant="secondary" icon="library_books">
                {T.header.library}
              </Button>
              <LiquidGlassButton to="/learning?action=upload" icon="upload_file">
                {T.header.start}
              </LiquidGlassButton>
            </>
          }
        />

        <div className="inline-flex max-w-full rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-1 shadow-[var(--premium-shadow-sm)]">
          <SegmentedControl options={T.tabs} value={tab} onChange={setTab} className="border-0 bg-transparent" />
        </div>

        {tab === "guide" && (
          <div className="grid gap-3 md:grid-cols-2">
            {T.guide.map((item) => (
              <Surface key={item.title} className="p-4 sm:p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--brand-primary)]">
                  <span className="material-symbols-outlined icon-thin text-[20px]">{item.icon}</span>
                </span>
                <h2 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">{item.title}</h2>
                <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{item.body}</p>
              </Surface>
            ))}
          </div>
        )}

        {tab === "faq" && (
          <Surface className="p-4 sm:p-5">
            <div className="space-y-2">
              {T.faq.map(([question, answer], index) => {
                const open = openFaq === index;
                return (
                  <article key={question} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-[13px] font-semibold text-[var(--foreground)]">{question}</span>
                      <span className={`material-symbols-outlined text-[18px] text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </button>
                    {open && <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[13px] font-medium leading-6 text-[var(--muted)]">{answer}</p>}
                  </article>
                );
              })}
            </div>
          </Surface>
        )}

        {tab === "contact" && (
          <Surface className="p-4 sm:p-6">
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--foreground)]">{T.contact.title}</h2>
              <p className="mt-1 text-[13px] font-medium leading-6 text-[var(--muted)]">
                {T.contact.subtitle}
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[var(--muted)]">{T.contact.subject}</label>
                  <input
                    value={contactForm.subject}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, subject: event.target.value }))}
                    className="premium-input h-10 px-3"
                    placeholder={T.contact.subjectPlaceholder}
                  />
                  {errors.subject && <p className="mt-1 text-[11px] font-semibold text-[var(--brand-rose)]">{errors.subject}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[var(--muted)]">{T.contact.message}</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                    rows={5}
                    className="premium-input resize-none px-3 py-3"
                    placeholder={T.contact.messagePlaceholder}
                  />
                  <div className="mt-1 flex justify-between gap-3">
                    {errors.message ? <p className="text-[11px] font-semibold text-[var(--brand-rose)]">{errors.message}</p> : <span />}
                    <p className="text-[10px] font-semibold text-[var(--muted)]">{T.contact.charCount(contactForm.message.length)}</p>
                  </div>
                </div>
                <Button icon="send" onClick={submitSupport}>
                  {T.contact.submit}
                </Button>
              </div>
            </div>
          </Surface>
        )}
      </PageFrame>
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
