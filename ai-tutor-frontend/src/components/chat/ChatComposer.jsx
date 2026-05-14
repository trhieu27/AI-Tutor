import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import { CHAT_WORKSPACE_TEXTS } from "@/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.composer;

export default function ChatComposer({ value, onChange, onSubmit, onCancel, loading, disabled, placeholder }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
        className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] px-2.5 py-2 shadow-[0_12px_28px_oklch(22%_0.026_238/0.08)]"
      >
        <label className="sr-only" htmlFor="chat-composer">
          {T.label}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-composer"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit?.();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={placeholder || T.placeholder}
            className="min-h-8 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] font-medium leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:opacity-60"
          />
          <div className="flex shrink-0 items-center gap-2">
            {loading && (
              <Button variant="ghost" size="sm" icon="stop_circle" onClick={onCancel}>
                {T.stop}
              </Button>
            )}
            <LiquidGlassButton type="submit" size="sm" icon="send" loading={loading} disabled={disabled || !value.trim()}>
              {T.send}
            </LiquidGlassButton>
          </div>
        </div>
      </form>
      <p className="mt-2 px-2 text-center text-[11px] font-medium leading-5 text-[var(--muted)]">
        {T.disclaimer}
      </p>
    </div>
  );
}
