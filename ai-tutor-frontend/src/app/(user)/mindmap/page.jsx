import DocumentPicker from "@/components/documents/DocumentPicker";
import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import { PageFrame, PageHeader, Surface } from "@/components/ui/Premium";
import { MINDMAP_WORKSPACE_TEXTS } from "@/constants/texts";

const T = MINDMAP_WORKSPACE_TEXTS;

export default function MindmapListPage() {
  return (
    <PageFrame className="space-y-6">
      <PageHeader
        icon="account_tree"
        title={T.header.title}
        subtitle={T.header.subtitle}
        actions={
          <>
            <Button to="/learning" variant="secondary" icon="library_books">
              {T.header.library}
            </Button>
            <LiquidGlassButton to="/learning?action=upload" icon="upload_file">
              {T.header.upload}
            </LiquidGlassButton>
          </>
        }
      />

      <DocumentPicker
        title={T.picker.title}
        subtitle={T.picker.subtitle}
        actionLabel={T.picker.actionLabel}
        actionIcon="account_tree"
        actionForDocument={(doc) => `/mindmap/${doc.id}`}
        liquidAction
      />

      <Surface className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {T.cards.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 sm:p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card-bg)] text-[var(--brand-primary)] sm:h-9 sm:w-9">
                <span className="material-symbols-outlined icon-thin text-[17px] sm:text-[18px]">{icon}</span>
              </span>
              <h3 className="mt-3 text-[12px] font-semibold leading-4 text-[var(--foreground)] sm:text-[13px]">{title}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-[var(--muted)] sm:text-[12px] sm:leading-5">{desc}</p>
            </div>
          ))}
        </div>
      </Surface>
    </PageFrame>
  );
}
