import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchSharedContent } from "@/shared/services/api.service";

/**
 * ShareRedirect — clone shared chat vào history, rồi chuyển thẳng đến chat
 */
export default function ShareRedirect() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchSharedContent(shareId)
      .then((data) => {
        if (!active) return;
        if (data.document_id && data.session_id) {
          navigate(`/chat/${data.document_id}?session=${data.session_id}`, { replace: true });
        } else {
          setError("Dữ liệu chia sẻ không hợp lệ");
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Không thể mở link chia sẻ");
      });
    return () => { active = false; };
  }, [shareId, navigate]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)]">
            <span className="material-symbols-outlined icon-thin text-[26px] text-[var(--brand-rose)]">link_off</span>
          </span>
          <h1 className="mt-3 text-[16px] font-bold text-[var(--foreground)]">{error}</h1>
          <p className="max-w-xs text-[12px] font-medium leading-5 text-[var(--muted)]">
            Link chia sẻ không tồn tại hoặc đã hết hạn
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--brand-primary)] px-4 text-[12px] font-bold text-white transition hover:opacity-90"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--background)]">
      <span className="h-9 w-9 animate-spin rounded-full border-[2.5px] border-[var(--brand-primary)] border-t-transparent" />
      <span className="text-[13px] font-semibold text-[var(--muted)]">Đang mở cuộc trò chuyện...</span>
    </div>
  );
}
