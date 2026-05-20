import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import {
  deleteAdminDocument,
  fetchAdminDocuments,
  readCachedAdminDocuments,
  retryAdminDocument,
} from "@/features/admin/services/admin.service";
import { ADMIN_TEXTS } from "@/shared/constants/texts";
import {
  AdminActionButton,
  AdminConfirmDialog,
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
} from "@/features/admin/components/AdminPrimitives";

const STATUS_OPTIONS = [
  { id: "", label: "Tất cả trạng thái" },
  { id: "READY", label: "Sẵn sàng" },
  { id: "PROCESSING", label: "Đang xử lý" },
  { id: "UPLOADING", label: "Đang tải lên" },
  { id: "FAILED", label: "Lỗi xử lý" },
];
const INITIAL_FILTERS = { page: 1, limit: 5, search: "", status: "" };

function statusTone(status) {
  if (status === "READY") return "green";
  if (status === "FAILED") return "rose";
  if (status === "PROCESSING" || status === "UPLOADING") return "warm";
  return "neutral";
}

function DocumentActions({ doc, busyId, onDelete }) {
  return (
    <div className="admin-action-group admin-document-actions" aria-label="Thao tác tài liệu">
      <AdminActionButton
        icon="delete"
        tone="rose"
        loading={busyId === `delete:${doc.id}`}
        onClick={() => onDelete(doc)}
      >
        {ADMIN_TEXTS.documents.delete}
      </AdminActionButton>
    </div>
  );
}

function DocumentCard({ doc, busyId, onDelete }) {
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
      <div className="mt-3"><DocumentActions doc={doc} busyId={busyId} onDelete={onDelete} /></div>
    </article>
  );
}

export default function AdminDocumentsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState(() => readCachedAdminDocuments(INITIAL_FILTERS));
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(() => !readCachedAdminDocuments(INITIAL_FILTERS));
  const [error, setError] = useState("");
  const [confirmDoc, setConfirmDoc] = useState(null);

  const [fetching, setFetching] = useState(false);
  const hasLoaded = useRef(!!readCachedAdminDocuments(INITIAL_FILTERS));
  const activeQueryRef = useRef("");

  const load = useCallback(async () => {
    const queryStr = JSON.stringify(filters);
    activeQueryRef.current = queryStr;

    const cached = readCachedAdminDocuments(filters);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    if (!cached) setFetching(true);
    setError("");
    try {
      const nextData = await fetchAdminDocuments(filters);
      if (activeQueryRef.current !== queryStr) return;
      setData(nextData);
      hasLoaded.current = true;
    } catch (err) {
      if (activeQueryRef.current !== queryStr) return;
      if (!cached) setError(err.message);
      else console.error(err.message);
    } finally {
      if (activeQueryRef.current === queryStr) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const intervalId = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  useAdminRealtime(useCallback((message) => {
    if (message.event !== "document_status_changed") return;
    if (document.visibilityState !== "visible") return;
    load();
  }, [load]));

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));

  const retryDoc = async (doc) => {
    setBusyId(`retry:${doc.id}`);
    try {
      await retryAdminDocument(doc.id);
      await load();
    } catch (err) {
      console.error(err.message);
    } finally {
      setBusyId("");
    }
  };

  const requestDelete = (doc) => setConfirmDoc(doc);

  const confirmDelete = async () => {
    if (!confirmDoc) return;
    const doc = confirmDoc;
    setConfirmDoc(null);
    setBusyId(`delete:${doc.id}`);
    try {
      await deleteAdminDocument(doc.id);
      await load();
    } catch (err) {
      console.error(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <AdminPageIntro title={ADMIN_TEXTS.documents.title} subtitle="Theo dõi xử lý tài liệu, nội dung AI đã tạo và các trạng thái lỗi trên toàn hệ thống" />
      <div className="space-y-5 p-4 sm:p-6">
        <AdminConfirmDialog
          open={!!confirmDoc}
          title="Xác nhận xóa"
          message={`Bạn có chắc muốn xóa tài liệu "${confirmDoc?.file_name}"? Hành động này không thể hoàn tác.`}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDoc(null)}
          tone="rose"
        />
        <AdminSection>
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
            <AdminInput icon="search" placeholder={ADMIN_TEXTS.documents.searchPlaceholder} value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
            <AdminSelect value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              {STATUS_OPTIONS.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </AdminSelect>
          </div>
        </AdminSection>

        {loading ? (
          <AdminLoading
            variant="table"
            columns={["Tài liệu", ADMIN_TEXTS.documents.owner, ADMIN_TEXTS.documents.status, ADMIN_TEXTS.documents.pages, ADMIN_TEXTS.documents.size, ADMIN_TEXTS.common.actions]}
            widths={["30%", "24%", "14%", "10%", "12%", "10%"]}
            cellTypes={["twoLine", "twoLine", "pill", "shortText", "text", "actions"]}
          />
        ) : error ? (
          <AdminError message={error} onRetry={load} />
        ) : (
          <div style={fetching && !loading ? { opacity: 0.5, pointerEvents: 'none', transition: 'opacity 150ms ease' } : { transition: 'opacity 150ms ease' }}>
          <AdminSection title="Danh sách tài liệu" subtitle={`${formatNumber(data?.pagination?.total || 0)} tài liệu`}>
            {(data?.items || []).length ? (
              <>
                <AdminTable
                  columns={["Tài liệu", ADMIN_TEXTS.documents.owner, ADMIN_TEXTS.documents.status, ADMIN_TEXTS.documents.pages, ADMIN_TEXTS.documents.size, ADMIN_TEXTS.common.actions]}
                  minWidth="980px"
                  widths={["30%", "24%", "14%", "10%", "12%", "10%"]}
                >
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
                      <td className="px-4 py-3 text-left"><DocumentActions doc={doc} busyId={busyId} onDelete={requestDelete} /></td>
                    </tr>
                  ))}
                </AdminTable>
                <div className="space-y-3 p-3 md:hidden">
                  {data.items.map((doc) => <DocumentCard key={doc.id} doc={doc} busyId={busyId} onDelete={requestDelete} />)}
                </div>
                <AdminPagination pagination={data.pagination} onPageChange={(page) => setFilter("page", page)} onLimitChange={(limit) => setFilter("limit", limit)} />
              </>
            ) : (
              <AdminEmpty icon="folder_off" title="Không có tài liệu phù hợp" subtitle="Thử bỏ bộ lọc trạng thái hoặc tìm theo chủ sở hữu" />
            )}
          </AdminSection>
          </div>
        )}
      </div>
    </div>
  );
}
