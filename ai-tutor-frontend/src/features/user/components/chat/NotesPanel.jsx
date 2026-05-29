import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TAG_DOTS = {
  "Định nghĩa": "bg-[var(--brand-secondary)]",
  "Công thức": "bg-[var(--brand-primary)]",
  "Ví dụ": "bg-[var(--brand-warm)]",
  "So sánh": "bg-[var(--brand-rose)]",
  "Quy trình": "bg-[var(--brand-primary)]",
  "Tóm tắt": "bg-[var(--muted)]",
  "Ghi chú": "bg-[var(--muted-light)]",
};

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function NoteCard({ note, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.content);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleSave() {
    if (editText.trim() && editText.trim() !== note.content) {
      onEdit(note.id, editText.trim());
    }
    setEditing(false);
  }

  function handleDelete() {
    setDeleting(true);
    onDelete(note.id);
  }

  const tagDot = TAG_DOTS[note.tag] || "bg-[var(--muted-light)]";

  return (
    <div
      className={`group cursor-pointer rounded-[var(--radius-panel)] border px-2.5 py-2 transition-all duration-150 ${expanded ? "border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--premium-shadow-sm)]" : "border-[var(--border-subtle)] bg-[var(--card-bg)] hover:border-[var(--border-color)] hover:shadow-[var(--premium-shadow-sm)]"}`}
      onClick={() => { if (!editing) setExpanded((v) => !v); }}
    >
      {/* Content */}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1.5 text-[11.5px] font-medium leading-5 text-[var(--foreground)] outline-none transition focus:border-[var(--border-emphasis)] focus:shadow-[var(--premium-ring)]"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-6 items-center rounded-[var(--radius-control)] bg-[var(--brand-primary)] px-2.5 text-[10.5px] font-bold text-white transition hover:opacity-90"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditText(note.content); }}
              className="inline-flex h-6 items-center rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-2.5 text-[10.5px] font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {expanded ? (
            <div>
              <div className="prose-saas max-w-none rounded-lg bg-[var(--card-bg)] p-2 text-[var(--foreground)] [&_*]:!text-[11px] [&_*]:!leading-[1.6] [&_h1]:!text-[12px] [&_h2]:!text-[12px] [&_h3]:!text-[11.5px] [&_h1]:!font-bold [&_h2]:!font-bold [&_h3]:!font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.formatted || note.content}
                </ReactMarkdown>
              </div>
              <p className="mt-1 text-center text-[9px] font-semibold text-[var(--muted-light)]">
                Nhấn để thu gọn
              </p>
            </div>
          ) : (
            <p className="line-clamp-2 text-[11.5px] font-medium leading-[1.55] text-[var(--foreground)]">
              {(note.formatted || note.content).replace(/[#*_`>\-]/g, "").replace(/\n+/g, " ").trim()}
            </p>
          )}
        </div>
      )}

      {/* Footer: dot · tag · time  |  actions */}
      <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tagDot}`} />
        {note.tag && <span className="text-[9.5px] font-semibold text-[var(--muted)]">{note.tag}</span>}
        <span className="text-[9px] text-[var(--muted-light)]">·</span>
        <span className="text-[9.5px] font-medium text-[var(--muted-light)]">{formatTime(note.created_at)}</span>
        <span className="flex-1" />

        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setEditText(note.content); }}
            className="grid h-5 w-5 place-items-center rounded text-[var(--muted-light)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--foreground)]"
            title="Chỉnh sửa"
          >
            <span className="material-symbols-outlined !text-[13px]">edit</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="grid h-5 w-5 place-items-center rounded text-[var(--muted-light)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--brand-rose)]"
          title="Xóa"
        >
          <span className="material-symbols-outlined !text-[13px]">delete</span>
        </button>
      </div>
    </div>
  );
}

/**
 * NotesPanel — shows saved notes for the current document.
 */
export default function NotesPanel({ notes, loading, onDelete, onEdit, onAdd }) {
  const [composing, setComposing] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await onAdd(newText.trim());
      setNewText("");
      setComposing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="h-3 w-16 rounded bg-[var(--border-subtle)]" />
            <div className="mt-2 h-3 w-full rounded bg-[var(--border-subtle)]" />
            <div className="mt-1.5 h-3 w-3/4 rounded bg-[var(--border-subtle)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Add note */}
      <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
        {composing ? (
          <div>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Viết ghi chú..."
              rows={3}
              autoFocus
              className="w-full rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-[12px] font-medium text-[var(--foreground)] placeholder:text-[var(--muted-light)] outline-none transition focus:border-[var(--border-emphasis)]"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || !newText.trim()}
                className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-control)] bg-[var(--brand-primary)] px-2.5 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving && <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />}
                Lưu
              </button>
              <button
                type="button"
                onClick={() => { setComposing(false); setNewText(""); }}
                className="inline-flex h-7 items-center rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-2.5 text-[11px] font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--border-emphasis)] hover:text-[var(--foreground)]"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Thêm ghi chú
          </button>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
              <span className="material-symbols-outlined icon-thin text-[20px] text-[var(--muted)]">sticky_note_2</span>
            </span>
            <p className="text-[12px] font-semibold text-[var(--muted)]">Chưa có ghi chú</p>
            <p className="max-w-[180px] text-[11px] font-medium leading-4 text-[var(--muted-light)]">
              Bôi đen text trong câu trả lời AI để lưu nhanh
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
