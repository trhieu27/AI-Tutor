import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSampleDocuments, cloneSampleDocument } from "@/shared/services/api.service";
import { useDocuments } from "@/features/user/context/DocumentContext";
import { Surface, cx } from "@/shared/ui/Premium";
import { Skeleton } from "@/shared/ui/States";

const CHIP_STYLE = {
  idle: "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]",
  active: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-primary)]",
};

const EXT_ICON = { ".pdf": "picture_as_pdf", ".doc": "description", ".docx": "description" };

const samplesCache = { data: null, loaded: false };

/* ── File row ─────────────────────────────────────────────────────── */

function FileRow({ file, onLearn }) {
  const [cloning, setCloning] = useState(false);

  const handleLearn = async () => {
    if (cloning) return;
    setCloning(true);
    try {
      await onLearn(file.id);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 transition-colors duration-150 hover:bg-[var(--card-bg-hover)]">
      {/* Icon */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]">
        <span className="material-symbols-outlined icon-thin text-[16px]" aria-hidden="true">
          {EXT_ICON[file.ext] || "description"}
        </span>
      </span>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold leading-snug text-[var(--foreground)]">
          {file.title}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-[var(--muted)]">
          {file.pages} trang
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <a
          href={`/api/v1/documents/samples/${file.id}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-[var(--muted)] transition-colors duration-150 hover:text-[var(--foreground)]"
        >
          Xem
        </a>
        <button
          type="button"
          disabled={cloning}
          onClick={handleLearn}
          className={cx(
            "rounded-[var(--radius-chip)] border border-[var(--success-border)] bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-primary)] transition-shadow duration-150 hover:shadow-[var(--premium-shadow-sm)]",
            cloning && "opacity-60 pointer-events-none"
          )}
        >
          {cloning ? (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined animate-spin text-[12px]">progress_activity</span>
              Đang thêm…
            </span>
          ) : (
            "Học ngay"
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────── */

function SamplesSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[30px] w-24 rounded-[var(--radius-chip)]" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-[var(--radius-chip)]" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

export default function SampleDocuments() {
  const navigate = useNavigate();
  const { refreshDocuments } = useDocuments();
  const [topics, setTopics] = useState(samplesCache.data || []);
  const [loading, setLoading] = useState(!samplesCache.loaded);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let active = true;
    if (!samplesCache.loaded) setLoading(true);

    fetchSampleDocuments()
      .then((data) => {
        if (active) {
          setTopics(data);
          samplesCache.data = data;
          samplesCache.loaded = true;
        }
      })
      .catch(() => {
        if (active && !samplesCache.loaded) {
          setTopics([]);
          samplesCache.loaded = true;
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleLearn = useCallback(async (sampleDocId) => {
    try {
      const cloned = await cloneSampleDocument(sampleDocId);
      // Refresh document list so the cloned doc appears in the library
      refreshDocuments?.(true);
      // Navigate to chat with the cloned document (owned by the user)
      navigate(`/chat/${cloned.id}`);
    } catch (err) {
      alert(err.message || "Không thể thêm tài liệu mẫu");
    }
  }, [navigate, refreshDocuments]);

  if (!loading && topics.length === 0) return null;

  const activeTopic = topics[activeIdx] || topics[0];

  return (
    <Surface className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Tài liệu mẫu
        </h2>
        <span className="text-[11px] font-medium text-[var(--muted)]">
          {!loading && `${topics.reduce((s, t) => s + t.files.length, 0)} tài liệu`}
        </span>
      </div>

      {loading ? (
        <SamplesSkeleton />
      ) : (
        <>
          {/* Topic tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
            {topics.map((topic, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={topic.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveIdx(idx)}
                  className={cx(
                    "rounded-[var(--radius-chip)] border px-3 py-1.5 text-[11px] font-bold transition-all duration-150",
                    isActive ? CHIP_STYLE.active : CHIP_STYLE.idle,
                    !isActive && "hover:border-[var(--border-emphasis)] hover:text-[var(--foreground)]"
                  )}
                >
                  {topic.title}
                </button>
              );
            })}
          </div>

          {/* File list */}
          {activeTopic && (
            <div
              className="divide-y divide-[var(--border-subtle)]"
              role="tabpanel"
            >
              {activeTopic.files.map((file) => (
                <FileRow key={file.id} file={file} onLearn={handleLearn} />
              ))}
              {activeTopic.files.length === 0 && (
                <p className="py-6 text-center text-[11px] font-medium text-[var(--muted)]">
                  Chưa có tài liệu cho chủ đề này
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Surface>
  );
}
