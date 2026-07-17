import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createChatShareLink } from "@/shared/services/api.service";

/**
 * Share dialog — compact, auto-creates link on open. No chat preview.
 */
export default function ShareDialog({ sessionId, title, onClose }) {
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    createChatShareLink(sessionId)
      .then((data) => {
        if (active) setShareUrl(`${window.location.origin}/shared/${data.id}`);
      })
      .catch((err) => {
        if (active) setError(err.message || "Lỗi tạo link");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [sessionId]);

  function handleCopy() {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "oklch(12% 0.018 238 / 0.42)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section
        className="w-full max-w-[380px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)]"
        style={{ boxShadow: "0 20px 60px oklch(12% 0.018 238 / 0.32)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Chia sẻ cuộc trò chuyện</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-3">
              <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[var(--brand-primary)] border-t-transparent" />
              <span className="text-[12px] font-medium text-[var(--muted)]">Đang tạo link...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5">
              <span className="material-symbols-outlined text-[16px] text-[var(--brand-rose)]">error</span>
              <span className="text-[12px] font-semibold text-[var(--brand-rose)]">{error}</span>
            </div>
          ) : (
            <>
              <p className="mb-2.5 text-[11px] font-medium text-[var(--muted)]">
                Bất kỳ ai có link đều có thể xem và tiếp tục trò chuyện.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-mono text-[var(--muted)] transition focus:border-[var(--border-emphasis)] focus:text-[var(--foreground)] focus:outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-[11px] font-bold transition ${
                    copied
                      ? "bg-[var(--brand-primary)] text-white"
                      : "border border-[var(--border-color)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--card-bg-hover)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{copied ? "check" : "content_copy"}</span>
                  {copied ? "Đã chép" : "Copy"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
