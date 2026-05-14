import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitationList from "@/components/chat/SourceCitationList";
import Button from "@/components/ui/Button";
import { cx } from "@/components/ui/Premium";
import { CHAT_WORKSPACE_TEXTS } from "@/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.messageActions;

export default function ChatMessage({ message, onRetry, onOpenSource }) {
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
          ) : (
            <div className="prose-saas max-w-none text-[13px] leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
