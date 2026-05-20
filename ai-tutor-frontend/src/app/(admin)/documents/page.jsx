import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminDocument,
  fetchAdminDocuments,
  retryAdminDocument,
} from "@/services/admin.service";
import { ADMIN_TEXTS } from "@/constants/texts";
import Button from "@/components/ui/Button";
import {
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminLoading,
  AdminPageIntro,
  AdminPagination,
  AdminSection,
  AdminSelect,
  AdminStatusPill,
  AdminTable,
  formatAdminStatus,
  formatDateTime,
  formatFileSize,
  formatNumber,
} from "@/components/admin/AdminPrimitives";

const STATUS_OPTIONS = [
  { id: "", label: "Tất cả trạng thái" },
  { id: "READY", label: "Sẵn sàng" },
  { id: "PROCESSING", label: "Đang xử lý" },
  { id: "UPLOADING", label: "Đang tải lên" },
  { id: "FAILED", label: "Lỗi xử lý" },
];

function statusTone(status) {
  if (status === "READY") return "green";
  if (status === "FAILED") return "rose";
  if (status === "PROCESSING" || status === "UPLOADING") return "warm";
  return "neutral";
}

function SkillPills({ doc }) {
  const skills = [
    [doc.has_summary, ADMIN_TEXTS.documents.skillLabels.summary, "summarize"],
    [doc.has_quiz, ADMIN_TEXTS.documents.skillLabels.quiz, "quiz"],
    [doc.has_mindmap, ADMIN_TEXTS.documents.skillLabels.mindmap, "account_tree"],
    [doc.has_study_questions, ADMIN_TEXTS.documents.skillLabels.studyQuestions, "help"],
  ];

  return (
    <div className="flex max-w-md flex-wrap gap-1">
      {skills.map(([enabled, label, icon]) => (
        <AdminStatusPill key={label} tone={enabled ? "blue" : "neutral"} icon={icon}>
          {label}
        </AdminStatusPill>
      ))}
    </div>
  );
}

function DocumentActions({ doc, busyId, onRetry, onDelete }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        variant={doc.status === "FAILED" ? "secondary" : "ghost"}
        size="sm"
        icon="refresh"
        loading={busyId === `retry:${doc.id}`}
        disabled={doc.status === "PROCESSING" || doc.status === "UPLOADING"}
        onClick={() => onRetry(doc)}
      >
        {ADMIN_TEXTS.documents.retry}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon="delete"
        loading={busyId === `delete:${doc.id}`}
        onClick={() => onDelete(doc)}
        className="hover:bg-[var(--danger-soft)] hover:text-[var(--brand-rose)]"
      >
        {ADMIN_TEXTS.documents.delete}
      </Button>
    </div>
  );
}

function DocumentCard({ doc, busyId, onRetry, onDelete }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-bold text-[var(--foreground)]">{doc.file_name}</h3>
          <p className="truncate text-[12px] font-semibold text-[var(--muted)]">{doc.owner?.email || doc.owner_id}</p>
          <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
            {formatFileSize(doc.file_size_mb)} · {formatNumber(doc.page_count)} trang · {formatDateTime(doc.uploaded_at)}
          </p>
        </div>
        <AdminStatusPill tone={statusTone(doc.status)}>{formatAdminStatus(doc.status)}</AdminStatusPill>
      </div>
      <div className="mt-3"><SkillPills doc={doc} /></div>
      <div className="mt-3"><DocumentActions doc={doc} busyId={busyId} onRetry={onRetry} onDelete={onDelete} /></div>
    </article>
  );
}

export default function AdminDocumentsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, search: "", status: "" });
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminDocuments(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

  const retryDoc = async (doc) => {
    setBusyId(`retry:${doc.id}`);
    try {
      await retryAdminDocument(doc.id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId("");
    }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(ADMIN_TEXTS.documents.confirmDelete)) return;
    setBusyId(`delete:${doc.id}`);
    try {
      await deleteAdminDocument(doc.id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.documents.title} subtitle="Theo dõi xử lý tài liệu, nội dung AI đã tạo và các trạng thái lỗi trên toàn hệ thống" />
      <div className="space-y-5 p-4 sm:p-6">
        <AdminSection>
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
            <AdminInput icon="search" placeholder={ADMIN_TEXTS.documents.searchPlaceholder} value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
            <AdminSelect value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              {STATUS_OPTIONS.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </AdminSelect>
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading variant="table" />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <AdminSection title="Danh sách tài liệu" subtitle={`${formatNumber(data?.pagination?.total || 0)} tài liệu`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable columns={["Tài liệu", ADMIN_TEXTS.documents.owner, ADMIN_TEXTS.documents.status, ADMIN_TEXTS.documents.pages, ADMIN_TEXTS.documents.size, ADMIN_TEXTS.documents.skills, ADMIN_TEXTS.common.actions]} minWidth="1180px">
                  {data.items.map((doc) => (
                    <tr key={doc.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-3">
                        <p className="max-w-64 truncate text-[13px] font-bold text-[var(--foreground)]">{doc.file_name}</p>
                        <p className="max-w-64 truncate text-[11px] font-semibold text-[var(--muted)]">{formatDateTime(doc.uploaded_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-56 truncate text-[12px] font-bold text-[var(--foreground)]">{doc.owner?.full_name || "Không rõ"}</p>
                        <p className="max-w-56 truncate text-[11px] font-semibold text-[var(--muted)]">{doc.owner?.email || doc.owner_id}</p>
                      </td>
                      <td className="px-4 py-3"><AdminStatusPill tone={statusTone(doc.status)}>{formatAdminStatus(doc.status)}</AdminStatusPill></td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatNumber(doc.page_count)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--foreground)]">{formatFileSize(doc.file_size_mb)}</td>
                      <td className="px-4 py-3"><SkillPills doc={doc} /></td>
                      <td className="px-4 py-3 text-right"><DocumentActions doc={doc} busyId={busyId} onRetry={retryDoc} onDelete={deleteDoc} /></td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {data.items.map((doc) => <DocumentCard key={doc.id} doc={doc} busyId={busyId} onRetry={retryDoc} onDelete={deleteDoc} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} />
              </>
            ) : (
              <AdminEmpty icon="folder_off" title="Không có tài liệu phù hợp" subtitle="Thử bỏ bộ lọc trạng thái hoặc tìm theo chủ sở hữu" />
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
