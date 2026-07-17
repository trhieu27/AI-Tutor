import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitationList from "@/features/user/components/chat/SourceCitationList";
import Button from "@/shared/ui/Button";
import { cx } from "@/shared/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.messageActions;

/** Map pipeline step → Vietnamese label */
const STEP_LABELS = {
  analyzing: 'Đang phân tích câu hỏi...',
  searching: 'Đang tìm tài liệu liên quan...',
  reranking: 'Đang sắp xếp kết quả...',
  generating: 'Đang tạo câu trả lời...',
};

function PipelineStatus({ step }) {
  const label = STEP_LABELS[step] || 'Đang xử lý...';
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-35" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
      </span>
      <span className="text-[12px] font-semibold text-[var(--muted)]">{label}</span>
    </div>
  );
}

const ChatMessage = memo(function ChatMessage({ message, onRetry, onOpenSource, streaming, onTextSelect }) {
  const isUser = message.role === "user" || message.isUser;
  const content = typeof message.content === "string" ? message.content : String(message.content || "");

  const handleMouseUp = useCallback(() => {
    if (!onTextSelect) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 3) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    onTextSelect(text, rect.left + rect.width / 2, rect.top);
  }, [onTextSelect]);

  return (
    <article className={cx("flex", isUser && "justify-end")}>
      <div className={cx("min-w-0 max-w-[min(760px,100%)]", isUser ? "flex flex-col items-end" : "w-full")}>
        <div
          className={cx(
            "rounded-[var(--radius-panel)] border px-4 py-3 shadow-[var(--premium-shadow-sm)]",
            isUser
              ? "border-transparent bg-[var(--foreground)] text-[var(--background)]"
              : "border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)]"
          )}
        >
        {isUser ? (
            <p className="whitespace-pre-wrap text-[13px] font-semibold leading-6">{content}</p>
          ) : streaming && !content ? (
            <PipelineStatus step={message._status} />
          ) : streaming ? (
            <div className="prose-saas max-w-none text-[13px] leading-7">
              <span className="whitespace-pre-wrap">{content}</span>
              <span className="inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-[var(--brand-primary)]" />
            </div>
          ) : (
            <div className="prose-saas max-w-none text-[13px] leading-7" onMouseUp={handleMouseUp}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources ẩn trong chat bubble — vẫn hiển thị ở panel bên phải */}

        {!isUser && onRetry && (
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" icon="content_copy" onClick={() => navigator.clipboard?.writeText(content)}>
              {T.copy}
            </Button>
            <Button variant="ghost" size="sm" icon="refresh" onClick={onRetry}>
              {T.retry}
            </Button>
          </div>
        )}
    </div>
    </article>
  );
});

export default ChatMessage;
