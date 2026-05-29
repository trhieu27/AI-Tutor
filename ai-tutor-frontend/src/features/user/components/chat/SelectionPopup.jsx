import { createPortal } from "react-dom";

/**
 * SelectionPopup — floating popup khi user boi den text AI message.
 * Shows "Luu vao ghi chu" button near the selection.
 */
export default function SelectionPopup({ x, y, text, onSave, onClose }) {
  if (!text) return null;

  function handleSave() {
    onSave(text);
    onClose();
  }

  return createPortal(
    <>
      {/* Invisible backdrop to close on click outside */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-[9999] animate-[fadeInUp_150ms_ease-out]"
        style={{ left: `${x}px`, top: `${y - 44}px`, transform: "translateX(-50%)" }}
      >
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)] shadow-[0_8px_24px_oklch(22%_0.026_238/0.16)] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <span className="material-symbols-outlined text-[14px] text-[var(--brand-primary)]">bookmark_add</span>
          Lưu vào ghi chú
        </button>
        {/* Arrow */}
        <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[var(--border-color)]" />
      </div>
    </>,
    document.body
  );
}
