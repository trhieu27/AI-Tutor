import { useEffect, useRef, useState } from "react";
import DocumentTable from "@/features/user/components/DocumentTable";
import UploadArea from "@/features/user/components/UploadArea";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton";
import Button from "@/shared/ui/Button";
import { PageFrame, PageHeader, Surface } from "@/shared/ui/Premium";
import { DOCUMENT_LIBRARY_PAGE_TEXTS } from "@/shared/constants/texts";

const T = DOCUMENT_LIBRARY_PAGE_TEXTS;

export default function LearningPage() {
  const uploadRef = useRef(null);
  const hasAutoOpened = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const focusUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      uploadRef.current?.querySelector('input[type="file"]')?.click();
    }, 420);
  };

  useEffect(() => {
    if (hasAutoOpened.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "upload") {
      hasAutoOpened.current = true;
      setTimeout(() => {
        focusUpload();
        window.history.replaceState({}, "", "/learning");
      }, 250);
    }
  }, []);

  return (
    <PageFrame className="space-y-4 !py-4 sm:space-y-6 sm:!py-8 lg:!py-10">
      <PageHeader
        icon="library_books"
        title={T.header.title}
        subtitle={T.header.subtitle}
        actions={
          <>
            <Button to="/chat" variant="secondary" icon="forum">
              {T.header.chat}
            </Button>
            <LiquidGlassButton icon="upload_file" onClick={focusUpload}>
              {T.header.upload}
            </LiquidGlassButton>
          </>
        }
      />

      <div ref={uploadRef}>
        <Surface className="p-4 sm:p-5" as="section">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{T.upload.title}</h2>
              <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">
                PDF, DOC, DOCX. Tối đa 25MB.
              </p>
            </div>
          </div>
          <UploadArea onUploadSuccess={() => setRefreshTrigger((value) => value + 1)} />
        </Surface>
      </div>

      <DocumentTable refreshTrigger={refreshTrigger} showActions />
    </PageFrame>
  );
}
