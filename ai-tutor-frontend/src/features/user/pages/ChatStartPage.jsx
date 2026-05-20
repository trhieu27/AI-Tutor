import DocumentPicker from "@/features/user/components/documents/DocumentPicker";
import Button from "@/shared/ui/Button";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import { PageFrame, PageHeader } from "@/shared/ui/Premium";
import { CHAT_START_PAGE_TEXTS } from "@/shared/constants/texts";

const T = CHAT_START_PAGE_TEXTS;

export default function ChatStartPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <PageFrame className="space-y-6">
        <PageHeader
          icon="forum"
          title={T.header.title}
          subtitle={T.header.subtitle}
          actions={
            <>
              <Button to="/learning" variant="secondary" icon="library_books">
                {T.header.library}
              </Button>
              <LiquidGlassButton to="/learning?action=upload" icon="upload_file">
                {T.header.uploadFirst}
              </LiquidGlassButton>
            </>
          }
        />

        <DocumentPicker
          title={T.picker.title}
          subtitle={T.picker.subtitle}
          actionLabel={T.picker.actionLabel}
          actionIcon="forum"
          actionForDocument={(doc) => `/chat/${doc.id}`}
          liquidAction
        />
      </PageFrame>
    </div>
  );
}
