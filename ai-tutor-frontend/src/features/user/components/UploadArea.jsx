import { useRef, useState } from "react";
import { useUpload } from "@/features/user/context/UploadContext";
import { UPLOAD_AREA_TEXTS, UPLOAD_DROPZONE_TEXTS } from "@/shared/constants/texts";
import { ALLOWED_UPLOAD_TYPES } from "@/shared/constants/uploadConstants";
import { cx } from "@/shared/ui/Premium";

export default function UploadArea({ onUploadSuccess }) {
  const { queue, addToQueue, removeFromQueue, isAnyUploading } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    const allowedTypes = [...ALLOWED_UPLOAD_TYPES, "application/msword"];
    const allowedExt = [".pdf", ".doc", ".docx"];
    const hasInvalid = Array.from(files).some((file) => {
      const name = file.name.toLowerCase();
      return !allowedTypes.includes(file.type) && !allowedExt.some((ext) => name.endsWith(ext));
    });
    if (hasInvalid) {
      setError(UPLOAD_DROPZONE_TEXTS.invalidType);
      return;
    }
    setError("");
    await addToQueue(files);
    onUploadSuccess?.();
  };

  const handleFileChange = (event) => {
    processFiles(event.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          processFiles(event.dataTransfer.files);
        }}
        onClick={() => !isAnyUploading && fileInputRef.current?.click()}
        className={cx(
          "group relative flex min-h-[140px] sm:min-h-[220px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-6 text-center transition-all duration-200",
          isDragging
            ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.08)] shadow-[var(--premium-ring)]"
            : "border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg)]",
          isAnyUploading && "cursor-wait opacity-70"
        )}
      >
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(166 61% 35% / 0.08) 1px, transparent 1px), linear-gradient(to bottom, hsl(166 61% 35% / 0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex max-w-sm flex-col items-center gap-4">
          <span
            className={cx(
              "flex h-14 w-14 items-center justify-center rounded-lg text-white shadow-[0_12px_26px_hsl(166_61%_35%/0.24)] transition-all duration-200",
              isAnyUploading
                ? "bg-[var(--brand-secondary)]"
                : "bg-[var(--brand-primary)] group-hover:-translate-y-1 group-hover:rotate-2"
            )}
          >
            <span className="material-symbols-outlined icon-thin text-[28px]">
              {isAnyUploading ? "sync" : "upload_file"}
            </span>
          </span>

          <div>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
              {isAnyUploading ? UPLOAD_DROPZONE_TEXTS.uploadingQueue : UPLOAD_AREA_TEXTS.title}
            </h3>
            <p className="mt-2 text-[12px] font-medium leading-6 text-[var(--muted)]">
              {UPLOAD_DROPZONE_TEXTS.dropHint}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {UPLOAD_DROPZONE_TEXTS.badges().map((label) => (
              <span
                key={label}
                className="rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--muted)]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx"
          multiple
        />
      </div>

      {queue.length > 0 && (
        <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {queue.map((item) => {
            const statusTone =
              item.status === "success"
                ? "text-[var(--brand-success)] bg-[hsl(154_60%_38%/0.10)]"
                : item.status === "error"
                  ? "text-[var(--brand-rose)] bg-[hsl(346_78%_53%/0.10)]"
                  : "text-[var(--brand-secondary)] bg-[hsl(218_82%_55%/0.10)]";
            return (
              <div
                key={item.id}
                className="group/item flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-emphasis)]"
              >
                <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", statusTone)}>
                  <span className="material-symbols-outlined icon-thin text-[18px]">
                    {item.status === "success" ? "check_circle" : item.status === "error" ? "error" : item.status === "uploading" ? "sync" : "schedule"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="truncate text-[12px] font-bold text-[var(--foreground)]">{item.file.name}</p>
                    <p className="shrink-0 text-[10px] font-medium text-[var(--muted-light)]">
                      {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--surface)]">
                    <div
                      className={cx(
                        "h-full rounded-full transition-all duration-500",
                        item.status === "success"
                          ? "bg-[var(--brand-success)]"
                          : item.status === "error"
                            ? "bg-[var(--brand-rose)]"
                            : "bg-[var(--brand-secondary)]"
                      )}
                      style={{ width: item.status === "success" ? "100%" : item.status === "uploading" ? "68%" : "8%" }}
                    />
                  </div>
                  {item.status === "error" && item.error && (
                    <p className="mt-1.5 text-[11px] font-semibold text-[var(--brand-rose)] leading-4">
                      {item.error}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromQueue(item.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted-light)] opacity-0 transition-all hover:bg-[hsl(346_78%_53%/0.10)] hover:text-[var(--brand-rose)] group-hover/item:opacity-100 max-sm:opacity-100"
                  aria-label={UPLOAD_DROPZONE_TEXTS.removeFromQueue}
                >
                  <span className="material-symbols-outlined icon-thin text-[16px]">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-[hsl(346_78%_53%/0.22)] bg-[hsl(346_78%_53%/0.08)] p-3">
          <span className="material-symbols-outlined icon-thin shrink-0 text-[18px] text-[var(--brand-rose)]">error</span>
          <p className="flex-1 text-[12px] font-semibold text-[var(--brand-rose)]">{error}</p>
          <button type="button" onClick={() => setError("")} className="text-[var(--muted-light)] hover:text-[var(--foreground)]">
            <span className="material-symbols-outlined icon-thin text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
