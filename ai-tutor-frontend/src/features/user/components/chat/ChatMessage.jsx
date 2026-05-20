import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitationList from "@/features/user/components/chat/SourceCitationList";
import Button from "@/shared/ui/Button";
import { cx } from "@/shared/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.messageActions;

export default function ChatMessage({ message, onRetry, onOpenSource, streaming }) {
  const isUser = message.role === "user" || message.isUser;
  const content = typeof message.content === "string" ? message.content : String(message.content || "");


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
            <div className="flex items-center gap-3 py-0.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-35" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
              </span>
              <span className="text-[12px] font-semibold text-[var(--muted)]">Đang tìm câu trả lời...</span>
            </div>
          ) : (
            <div className="prose-saas max-w-none text-[13px] leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              {streaming && <span className="inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-[var(--brand-primary)]" />}
            </div>
          )}
        </div>

        {!isUser && message.sources?.length > 0 && (
          <SourceCitationList sources={message.sources} compact inline className="mt-2 w-full" onOpenSource={onOpenSource} />
        )}

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
}
