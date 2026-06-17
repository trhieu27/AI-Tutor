import { cx } from "@/shared/ui/Premium";
import { Skeleton } from "@/shared/ui/States";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const T = CHAT_WORKSPACE_TEXTS.threads;

function getSessionTitle(session) {
  const title = String(session.title || T.fallbackTitle).trim().replace(/(?:\.{3}|…)+$/u, "").trim();
  return title || T.fallbackTitle;
}

function SessionMenu({ sessionId, onDelete, onShare, anchorRect, onClose }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const handleClick = (e) => { if (!menuRef.current?.contains(e.target)) onClose(); };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!anchorRect || !menuRef.current) return;
    const menu = menuRef.current;
    const menuH = menu.offsetHeight;
    const menuW = menu.offsetWidth;
    const gap = 4;
    const spaceBelow = window.innerHeight - anchorRect.bottom - gap;
    const top = spaceBelow >= menuH
      ? anchorRect.bottom + gap
      : anchorRect.top - menuH - gap;
    const left = Math.min(anchorRect.left, window.innerWidth - menuW - 8);
    setPosition({ top, left });
  }, [anchorRect]);

  if (!anchorRect) return null;

  const style = {
    position: "fixed",
    top: position?.top ?? -9999,
    left: position?.left ?? -9999,
    zIndex: 9999,
    visibility: position ? "visible" : "hidden",
  };

  return createPortal(
    <div ref={menuRef} style={style} className="min-w-[140px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-1 shadow-[var(--premium-shadow-md)]">
      {onShare && (
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          onClick={() => { onShare(sessionId); onClose(); }}
        >
          <span className="material-symbols-outlined icon-thin text-[16px] text-[var(--muted)]">share</span>
          Chia sẻ
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[12px] font-semibold text-[var(--brand-rose)] transition hover:bg-[var(--danger-soft)]"
          onClick={() => { onDelete(sessionId); onClose(); }}
        >
          <span className="material-symbols-outlined icon-thin text-[16px]">delete</span>
          Xóa
        </button>
      )}
    </div>,
    document.body
  );
}

export default function ChatThreadList({
  sessions = [],
  activeSessionId,
  onSelect,
  onDelete,
  onShare,
  onNewChat,
  onCollapse,
  search,
  onSearch,
  loading,
}) {
  const [menuState, setMenuState] = useState(null);
  const handleMore = useCallback((sessionId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuState({ sessionId, rect });
  }, []);
  const closeMenu = useCallback(() => setMenuState(null), []);
  return (
    <aside className="flex h-full flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)]">
      <div className="p-2.5">
        <div className="flex h-9 items-center justify-between px-1.5">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)]">{T.title}</h2>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Thu gọn"
            >
              <span className="material-symbols-outlined icon-thin text-[22px]" aria-hidden="true">
                dock_to_left
              </span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-2 flex h-11 w-full items-center gap-3 rounded-[10px] bg-[var(--surface)] px-4 text-left text-[13px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--card-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <span className="material-symbols-outlined icon-thin text-[22px]" aria-hidden="true">
            edit_square
          </span>
          <span className="truncate">{T.newSession}</span>
        </button>

        <label className="mt-2 flex h-10 items-center gap-3 rounded-[10px] bg-[var(--card-bg)] px-3 text-[var(--muted)] transition focus-within:bg-[var(--surface)] focus-within:text-[var(--foreground)]">
          <span className="material-symbols-outlined icon-thin text-[22px]" aria-hidden="true">
            search
          </span>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={T.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)]"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
        {loading ? (
          <div className="space-y-2 p-1" role="status" aria-label={T.loading} aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-[10px] border border-transparent bg-[var(--surface)] p-3">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="mt-2 h-2.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-[10px] bg-[var(--surface)] p-3">
            <p className="text-[12px] font-medium leading-5 text-[var(--muted)]">
              {T.empty}
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {sessions.map((session) => {
              const active = String(session.id) === String(activeSessionId);
              return (
                <div
                  key={session.id}
                  className={cx(
                    "group flex items-center rounded-lg transition-colors",
                    active
                      ? "bg-[var(--surface)] text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-none"
                  >
                    <span className={cx("block truncate text-[13px] leading-5", active ? "font-semibold" : "font-medium")}>
                      {getSessionTitle(session)}
                    </span>
                  </button>
                  {(onDelete || onShare) && (
                    <button
                      type="button"
                      aria-label="Tùy chọn"
                      className={cx(
                        "mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--card-bg-hover)] hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover:opacity-100",
                        active || menuState?.sessionId === session.id ? "opacity-70" : "opacity-0"
                      )}
                      onClick={(e) => handleMore(session.id, e)}
                    >
                      <span className="material-symbols-outlined icon-thin text-[16px]" aria-hidden="true">
                        more_horiz
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {menuState && (
        <SessionMenu
          sessionId={menuState.sessionId}
          onDelete={onDelete}
          onShare={onShare}
          anchorRect={menuState.rect}
          onClose={closeMenu}
        />
      )}
    </aside>
  );
}
