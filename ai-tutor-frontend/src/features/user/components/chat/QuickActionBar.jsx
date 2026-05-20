import Button from "@/shared/ui/Button";
import { CHAT_WORKSPACE_TEXTS } from "@/shared/constants/texts";

const QUICK_ACTIONS = CHAT_WORKSPACE_TEXTS.quickActions;

export default function QuickActionBar({ onAction, compact = false }) {
  return (
    <div className={compact ? "flex flex-col items-start gap-1.5" : "flex flex-wrap gap-2 py-2"}>
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.id}
          variant="subtle"
          size="sm"
          icon={action.icon}
          iconClassName={compact ? "text-[15px]" : ""}
          className={compact ? "w-fit max-w-full justify-start px-2.5 text-[11px]" : ""}
          onClick={() => onAction(action.id)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
