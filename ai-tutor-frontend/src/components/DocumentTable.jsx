import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteDocument } from "@/services/api.service";
import { DOCUMENT_TABLE_TEXTS } from "@/constants/texts";
import { useUpload } from "@/context/UploadContext";
import { useDocuments } from "@/context/DocumentContext";
import ConfirmDialog from "@/components/ConfirmDialog";

/* ── FileName: luôn truncate với "..." ───────────────────── */
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
function FileName({
  name
}) {
  return /*#__PURE__*/_jsx("p", {
    title: name,
    className: "text-[13px] font-semibold text-[var(--foreground)] truncate group-hover:text-[hsl(239_68%_58%)] transition-colors",
    children: name
  });
}

/* ── Skeleton row ─────────────────────────────────────────── */
function SkeletonRow({
  index,
  showActions
}) {
  return /*#__PURE__*/_jsxs("tr", {
    className: "row-enter border-b border-[var(--border-subtle)]",
    style: {
      animationDelay: `${index * 60}ms`
    },
    children: [/*#__PURE__*/_jsx("td", {
      className: "py-3.5 px-5",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-3",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-9 h-9 rounded-lg shimmer shrink-0"
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-2 flex-1",
          children: [/*#__PURE__*/_jsx("div", {
            className: "h-3 w-3/4 rounded-full shimmer"
          }), /*#__PURE__*/_jsx("div", {
            className: "h-2 w-1/3 rounded-full shimmer"
          })]
        })]
      })
    }), /*#__PURE__*/_jsx("td", {
      className: "py-3.5 px-4 text-center",
      children: /*#__PURE__*/_jsx("div", {
        className: "h-3 w-16 rounded-full shimmer mx-auto"
      })
    }), /*#__PURE__*/_jsx("td", {
      className: "py-3.5 px-4 text-center",
      children: /*#__PURE__*/_jsx("div", {
        className: "h-3 w-12 rounded-full shimmer mx-auto"
      })
    }), /*#__PURE__*/_jsx("td", {
      className: "py-3.5 px-4 text-center",
      children: /*#__PURE__*/_jsx("div", {
        className: "h-5 w-20 rounded-md shimmer mx-auto"
      })
    }), showActions && /*#__PURE__*/_jsx("td", {
      className: "py-3.5 px-3 text-center",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-center justify-center gap-1",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-7 h-7 rounded-md shimmer"
        }), /*#__PURE__*/_jsx("div", {
          className: "w-7 h-7 rounded-md shimmer"
        }), /*#__PURE__*/_jsx("div", {
          className: "w-7 h-7 rounded-md shimmer"
        }), /*#__PURE__*/_jsx("div", {
          className: "w-7 h-7 rounded-md shimmer"
        })]
      })
    })]
  });
}
export default function DocumentTable({
  refreshTrigger = 0,
  showActions = false,
  defaultAction = null,
  limit = null
}) {
  const navigate = useNavigate();
  const {
    lastUploadTime
  } = useUpload();
  const {
    documents,
    loading,
    refreshDocuments
  } = useDocuments();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const getRedirectUrl = docId => {
    if (defaultAction === "mindmap") return `/mindmap/${docId}`;
    if (defaultAction === "quiz") return `/quiz/${docId}`;
    const baseUrl = `/chat/${docId}`;
    return defaultAction ? `${baseUrl}?action=${defaultAction}` : baseUrl;
  };
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === "PROCESSING" || d.status === "UPLOADING");
    if (hasProcessing) {
      const timer = setInterval(() => refreshDocuments(true), 5000);
      return () => clearInterval(timer);
    }
  }, [documents, refreshDocuments]);
  useEffect(() => {
    if (refreshTrigger > 0) refreshDocuments();
  }, [refreshTrigger, refreshDocuments]);
  const handleDelete = async (documentId, fileName) => {
    setPendingDelete({
      id: documentId,
      name: fileName
    });
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setPendingDelete(null);
    try {
      await deleteDocument(pendingDelete.id);
      await refreshDocuments(true);
    } catch {
      alert("Xóa tài liệu thất bại.");
    } finally {
      setDeletingId(null);
    }
  };
  const handleRetry = async documentId => {
    setRetryingId(documentId);
    try {
      const {
        retryDocument
      } = await import("@/services/api.service");
      await retryDocument(documentId);
      await refreshDocuments(true);
    } catch (err) {
      alert(err.message || "Thử lại thất bại");
    } finally {
      setRetryingId(null);
    }
  };

  /* ── Status badge — border-only with pulsing dot ────────── */
  const getStatusBadge = (status, docId) => {
    switch (status) {
      case "READY":
        return /*#__PURE__*/_jsxs("span", {
          className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(158_64%_44%/0.35)] text-[hsl(158_60%_35%)] dark:text-[hsl(158_58%_58%)] bg-[hsl(158_64%_44%/0.04)] whitespace-nowrap",
          children: [/*#__PURE__*/_jsxs("span", {
            className: "relative flex w-1.5 h-1.5 shrink-0",
            children: [/*#__PURE__*/_jsx("span", {
              className: "animate-ping absolute inset-0 rounded-full bg-[hsl(158_64%_44%)] opacity-40"
            }), /*#__PURE__*/_jsx("span", {
              className: "relative rounded-full w-1.5 h-1.5 bg-[hsl(158_64%_44%)]"
            })]
          }), DOCUMENT_TABLE_TEXTS.status.processed]
        });
      case "PROCESSING":
      case "UPLOADING":
        return /*#__PURE__*/_jsxs("span", {
          className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(239_68%_58%/0.35)] text-[hsl(239_55%_50%)] dark:text-[hsl(239_68%_68%)] bg-[hsl(239_68%_58%/0.04)] whitespace-nowrap",
          children: [/*#__PURE__*/_jsxs("svg", {
            className: "w-3 h-3 animate-spin shrink-0",
            fill: "none",
            viewBox: "0 0 24 24",
            children: [/*#__PURE__*/_jsx("circle", {
              className: "opacity-25",
              cx: "12",
              cy: "12",
              r: "10",
              stroke: "currentColor",
              strokeWidth: "3"
            }), /*#__PURE__*/_jsx("path", {
              className: "opacity-75",
              fill: "currentColor",
              d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            })]
          }), status === "UPLOADING" ? "Đang tải" : "Đang xử lý"]
        });
      case "FAILED":
        return /*#__PURE__*/_jsxs("button", {
          onClick: e => {
            e.stopPropagation();
            handleRetry(docId);
          },
          disabled: retryingId === docId,
          className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold border border-[hsl(343_85%_58%/0.35)] text-[hsl(343_70%_45%)] bg-[hsl(343_85%_58%/0.04)] hover:bg-[hsl(343_85%_58%)] hover:text-white hover:border-transparent transition-all whitespace-nowrap",
          children: [/*#__PURE__*/_jsx("span", {
            className: `material-symbols-outlined icon-thin text-[12px] ${retryingId === docId ? "animate-spin" : ""}`,
            children: "refresh"
          }), "Th\u1EED l\u1EA1i"]
        });
    }
  };

  /* ── File icon ───────────────────────────────────────────── */
  const getFileIcon = fileName => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf";
    return /*#__PURE__*/_jsx("div", {
      className: `w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${isPdf ? "bg-[hsl(343_85%_58%/0.07)] text-[hsl(343_72%_48%)] border-[hsl(343_85%_58%/0.15)]" : "bg-[hsl(217_91%_60%/0.07)] text-[hsl(217_72%_48%)] border-[hsl(217_91%_60%/0.15)]"}`,
      children: /*#__PURE__*/_jsx("span", {
        className: "material-symbols-outlined icon-thin text-[17px]",
        children: isPdf ? "picture_as_pdf" : "description"
      })
    });
  };
  const filteredDocuments = documents.filter(doc => doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()));
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex flex-col bg-[var(--card-bg)] rounded-3xl overflow-hidden border border-[var(--border-color)] shadow-sm",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border-subtle)]",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-[14px] font-bold text-[var(--foreground)] leading-none mb-1",
            children: DOCUMENT_TABLE_TEXTS.title
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-1.5",
            children: [/*#__PURE__*/_jsx("span", {
              className: "w-1.5 h-1.5 rounded-full bg-[hsl(239_68%_58%)]"
            }), /*#__PURE__*/_jsxs("p", {
              className: "text-[11px] text-[var(--muted)] font-medium",
              children: [documents.length, " ", documents.length === 1 ? "tài liệu" : "tài liệu"]
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-2 flex-1 max-w-sm",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "relative flex-1",
            children: [/*#__PURE__*/_jsxs("svg", {
              className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              viewBox: "0 0 24 24",
              children: [/*#__PURE__*/_jsx("circle", {
                cx: 11,
                cy: 11,
                r: 8
              }), /*#__PURE__*/_jsx("path", {
                d: "m21 21-4.35-4.35",
                strokeLinecap: "round"
              })]
            }), /*#__PURE__*/_jsx("input", {
              type: "text",
              placeholder: "T\xECm t\xEAn t\xE0i li\u1EC7u, ch\u1EE7 \u0111\u1EC1...",
              value: searchTerm,
              onChange: e => setSearchTerm(e.target.value),
              className: "w-full pl-9 pr-4 py-2.5 bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-[hsl(214_32%_91%)] dark:border-white/10 rounded-xl text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.35)] focus:border-transparent transition-all font-medium shadow-[0_1px_3px_hsl(0_0%_0%/0.04)]"
            })]
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => refreshDocuments(),
            className: "w-10 h-10 shrink-0 flex items-center justify-center bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-[hsl(214_32%_91%)] dark:border-white/10 rounded-xl text-[var(--muted)] hover:text-[hsl(239_68%_58%)] hover:border-[hsl(239_68%_58%/0.30)] shadow-[0_1px_3px_hsl(0_0%_0%/0.04)] transition-all active:scale-90",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined icon-thin text-[17px]",
              children: "refresh"
            })
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "overflow-x-auto overflow-y-auto max-h-[50dvh] sm:max-h-[330px] w-full custom-scrollbar overscroll-none",
        children: /*#__PURE__*/_jsxs("table", {
          className: "w-full text-left border-collapse sm:table-fixed",
          children: [/*#__PURE__*/_jsx("thead", {
            className: "sticky top-0 z-20",
            style: {
              backgroundColor: 'var(--sidebar-bg)'
            },
            children: /*#__PURE__*/_jsxs("tr", {
              className: "border-b border-[hsl(214_32%_91%)] dark:border-white/8",
              children: [/*#__PURE__*/_jsx("th", {
                className: "py-3 px-5 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] sm:w-[36%]",
                children: DOCUMENT_TABLE_TEXTS.colName
              }), /*#__PURE__*/_jsx("th", {
                className: "py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center hidden sm:table-cell",
                style: {
                  width: "15%"
                },
                children: DOCUMENT_TABLE_TEXTS.colDate
              }), /*#__PURE__*/_jsx("th", {
                className: "py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center hidden sm:table-cell",
                style: {
                  width: "11%"
                },
                children: "Quy m\xF4"
              }), /*#__PURE__*/_jsx("th", {
                className: "py-3 px-4 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center hidden sm:table-cell",
                style: {
                  width: "16%"
                },
                children: DOCUMENT_TABLE_TEXTS.colStatus
              }), showActions && /*#__PURE__*/_jsx("th", {
                className: "py-3 px-3 text-[10px] font-bold tracking-[0.06em] text-[var(--muted-light)] text-center sm:w-[22%]",
                children: "Thao t\xE1c"
              })]
            })
          }), /*#__PURE__*/_jsx("tbody", {
            children: loading && documents.length === 0 ? Array.from({
              length: 5
            }).map((_, i) => /*#__PURE__*/_jsx(SkeletonRow, {
              index: i,
              showActions: showActions
            }, i)) : filteredDocuments.length > 0 ? filteredDocuments.map((doc, index) => /*#__PURE__*/_jsxs("tr", {
              onClick: () => doc.status === "READY" && navigate(getRedirectUrl(doc.id)),
              className: `row-enter border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150 group ${doc.status === "READY" ? "hover:bg-[var(--surface)] cursor-pointer" : "opacity-60 cursor-wait"}`,
              style: {
                animationDelay: `${index * 45}ms`
              },
              children: [/*#__PURE__*/_jsx("td", {
                className: "py-3.5 px-5",
                children: /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center gap-3 overflow-hidden",
                  children: [getFileIcon(doc.file_name), /*#__PURE__*/_jsxs("div", {
                    className: "min-w-0 flex-1",
                    children: [/*#__PURE__*/_jsx(FileName, {
                      name: doc.file_name
                    }), /*#__PURE__*/_jsxs("p", {
                      className: "text-[11px] text-[var(--muted-light)] mt-0.5 font-medium",
                      children: [doc.file_size_mb, " MB \xB7 ", doc.file_name.split(".").pop()?.toUpperCase()]
                    })]
                  })]
                })
              }), /*#__PURE__*/_jsx("td", {
                className: "py-3.5 px-4 text-center hidden sm:table-cell",
                children: /*#__PURE__*/_jsx("p", {
                  className: "text-[12px] font-medium text-[var(--muted)]",
                  children: new Date(doc.uploaded_at).toLocaleDateString("vi-VN")
                })
              }), /*#__PURE__*/_jsx("td", {
                className: "py-3.5 px-4 text-center hidden sm:table-cell",
                children: /*#__PURE__*/_jsx("p", {
                  className: "text-[12px] font-medium text-[var(--muted)]",
                  children: doc.page_count > 0 ? `${doc.page_count} trang` : "—"
                })
              }), /*#__PURE__*/_jsx("td", {
                className: "py-3.5 px-4 text-center hidden sm:table-cell",
                children: /*#__PURE__*/_jsx("div", {
                  className: "flex justify-center",
                  children: getStatusBadge(doc.status, doc.id)
                })
              }), showActions && /*#__PURE__*/_jsx("td", {
                className: "py-2 px-2 sm:py-3.5 sm:px-3 text-center",
                onClick: e => e.stopPropagation(),
                children: /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-center gap-1",
                  children: [doc.status === "READY" && /*#__PURE__*/_jsxs(_Fragment, {
                    children: [/*#__PURE__*/_jsx(Link, {
                      to: getRedirectUrl(doc.id),
                      className: "w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-[hsl(239_68%_58%/0.20)] text-[hsl(239_55%_50%)] hover:bg-[hsl(239_68%_58%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all",
                      title: "H\u1ECFi AI",
                      children: /*#__PURE__*/_jsx("span", {
                        className: "material-symbols-outlined icon-thin text-[13px] sm:text-[15px]",
                        children: "chat_bubble"
                      })
                    }), /*#__PURE__*/_jsx(Link, {
                      to: `/quiz/${doc.id}`,
                      className: "w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-[hsl(38_92%_50%/0.20)] text-[hsl(38_80%_42%)] hover:bg-[hsl(38_92%_50%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all",
                      title: "Luy\u1EC7n t\u1EADp",
                      children: /*#__PURE__*/_jsx("span", {
                        className: "material-symbols-outlined icon-thin text-[13px] sm:text-[15px]",
                        children: "quiz"
                      })
                    }), /*#__PURE__*/_jsx(Link, {
                      to: `/mindmap/${doc.id}`,
                      className: "w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-[hsl(173_58%_42%/0.20)] text-[hsl(173_50%_36%)] hover:bg-[hsl(173_58%_42%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all",
                      title: "S\u01A1 \u0111\u1ED3 t\u01B0 duy",
                      children: /*#__PURE__*/_jsx("span", {
                        className: "material-symbols-outlined icon-thin text-[13px] sm:text-[15px]",
                        children: "hub"
                      })
                    })]
                  }), /*#__PURE__*/_jsx("button", {
                    onClick: () => handleDelete(doc.id, doc.file_name),
                    disabled: deletingId === doc.id,
                    className: "w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-[var(--border-color)] text-[var(--muted-light)] hover:bg-[hsl(343_85%_58%)] hover:text-white hover:border-transparent flex items-center justify-center transition-all disabled:opacity-50",
                    title: "X\xF3a",
                    children: deletingId === doc.id ? /*#__PURE__*/_jsx("div", {
                      className: "w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin"
                    }) : /*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined icon-thin text-[13px] sm:text-[15px]",
                      children: "delete"
                    })
                  })]
                })
              })]
            }, doc.id)) : /*#__PURE__*/_jsx("tr", {
              children: /*#__PURE__*/_jsx("td", {
                colSpan: showActions ? 5 : 4,
                className: "p-0 border-none",
                children: /*#__PURE__*/_jsx("div", {
                  className: "min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer group/empty py-8",
                  onClick: () => {
                    if (window.location.pathname !== "/") {
                      navigate("/?action=upload");
                    } else {
                      const fi = document.querySelector('input[type="file"]');
                      if (fi) fi?.click();
                    }
                  },
                  children: /*#__PURE__*/_jsxs("div", {
                    className: "flex flex-col items-center gap-4 max-w-xs mx-auto transition-all duration-300 group-hover/empty:scale-105",
                    children: [/*#__PURE__*/_jsx("div", {
                      className: "w-14 h-14 bg-[var(--surface)] rounded-xl flex items-center justify-center border border-[var(--border-color)] group-hover/empty:border-[hsl(239_68%_58%/0.30)] transition-all",
                      children: /*#__PURE__*/_jsx("span", {
                        className: "material-symbols-outlined icon-thin text-[hsl(239_68%_58%)] text-[32px]",
                        children: "cloud_upload"
                      })
                    }), /*#__PURE__*/_jsxs("div", {
                      className: "space-y-1",
                      children: [/*#__PURE__*/_jsx("h3", {
                        className: "text-[14px] font-bold text-[var(--foreground)] group-hover/empty:text-[hsl(239_68%_58%)] transition-colors",
                        children: DOCUMENT_TABLE_TEXTS.empty?.title
                      }), /*#__PURE__*/_jsx("p", {
                        className: "text-[11px] text-[var(--muted)] font-medium leading-relaxed px-4",
                        children: DOCUMENT_TABLE_TEXTS.empty?.subtitle
                      })]
                    })]
                  })
                })
              })
            })
          })]
        })
      })]
    }), /*#__PURE__*/_jsx(ConfirmDialog, {
      open: !!pendingDelete,
      title: "X\xF3a t\xE0i li\u1EC7u",
      message: `Bạn có chắc muốn xóa "${pendingDelete?.name}"? Thao tác này không thể hoàn tác.`,
      confirmLabel: "X\xF3a",
      cancelLabel: "Gi\u1EEF l\u1EA1i",
      variant: "danger",
      onConfirm: confirmDelete,
      onCancel: () => setPendingDelete(null)
    })]
  });
}