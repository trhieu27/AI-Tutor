import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Button from "@/shared/ui/Button";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const T = CHAT_WORKSPACE_TEXTS.composer;

/**
 * Chat composer with internal input state.
 * Keystrokes only re-render this component, not the parent ChatPage.
 *
 * Parent API:
 *   ref.current.getValue()  — get current input text
 *   ref.current.clear()     — clear the input
 *   ref.current.focus()     — focus the textarea
 *   onSubmit(text)           — called with input text on send
 */
const ChatComposer = forwardRef(function ChatComposer(
  { onSubmit, onCancel, loading, disabled, placeholder, defaultValue },
  ref
) {
  const textareaRef = useRef(null);
  const [value, setValue] = useState(defaultValue || "");

  // Auto-resize textarea
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getValue: () => value,
    clear: () => setValue(""),
    focus: () => textareaRef.current?.focus(),
    setValue: (v) => setValue(v),
  }), [value]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit?.(text);
    setValue("");
  };

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
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
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={placeholder || T.placeholder}
            className="min-h-8 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] font-medium leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:opacity-60"
          />
          <div className="flex shrink-0 items-center gap-2">
            {loading ? (
              <Button
                variant="outline"
                size="sm"
                icon="stop_circle"
                onClick={onCancel}
                className="!text-[var(--brand-rose)] !border-[var(--danger-border)] hover:!bg-[var(--danger-soft)]"
              >
                {T.stop}
              </Button>
            ) : (
              <LiquidGlassButton
                type="submit"
                size="sm"
                icon="send"
                disabled={disabled || !value.trim()}
              >
                {T.send}
              </LiquidGlassButton>
            )}
          </div>
        </div>
      </form>
      <p className="mt-2 px-2 text-center text-[11px] font-medium leading-5 text-[var(--muted)]">
        {T.disclaimer}
      </p>
    </div>
  );
});

export default ChatComposer;
