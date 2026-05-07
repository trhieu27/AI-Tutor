import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocument, fetchDocumentQuiz, fetchDocumentQuizStream, QuotaError } from "@/services/api.service";
import { QUIZ_PAGE_TEXTS, QUOTA_TEXTS } from "@/constants/texts";
import ConfirmDialog from "@/components/ConfirmDialog";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function InteractiveQuizPage() {
  const params = useParams();
  const navigate = useNavigate();
  const documentId = params.documentId;
  const [docData, setDocData] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // User performance state
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Confirm dialogs
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // AbortController — hủy stream khi chuyển trang hoặc tạo lại
  const abortRef = useRef(null);
  const loadQuiz = async (force = false) => {
    // Hủy request cũ nếu đang chạy
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Helper: chỉ apply state nếu request này vẫn là active
    const isActive = () => abortRef.current === controller;
    setLoading(true);
    setError(null);
    setQuiz([]);
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(0);
    try {
      if (!docData) {
        const doc = await fetchDocument(documentId);
        if (isActive()) setDocData(doc);
      }
      let data = [];
      if (!force) {
        data = await fetchDocumentQuiz(documentId, controller.signal);
      }
      if (!data || data.length === 0) {
        let accumulated = "";
        await fetchDocumentQuizStream(documentId, chunk => {
          accumulated += chunk;
        }, force, controller.signal);
        try {
          let jsonStr = accumulated.trim();
          if (jsonStr.includes("```json")) {
            jsonStr = jsonStr.split("```json")[1].split("```")[0];
          } else if (jsonStr.includes("```")) {
            jsonStr = jsonStr.split("```")[1].split("```")[0];
          }
          data = JSON.parse(jsonStr.trim());
        } catch (e) {
          console.error("Failed to parse streamed quiz", e);
        }
      }
      if (!isActive()) return; // request bị huỷ sau khi fetch xong

      if (data && Array.isArray(data) && data.length > 0) {
        setQuiz(data);
      } else {
        setError("Không thể tạo bộ câu hỏi trắc nghiệm cho tài liệu này.");
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // bị huỷ chủ động — không cập nhật UI
      if (!isActive()) return;
      if (err instanceof QuotaError) {
        setQuotaExceeded(true);
        return;
      }
      console.error(err);
      setError("Đã xảy ra lỗi khi tải bài kiểm tra.");
    } finally {
      // Chỉ tắt loading nếu đây vẫn là request mới nhất
      if (isActive()) setLoading(false);
    }
  };
  useEffect(() => {
    const init = async () => {
      const doc = await fetchDocument(documentId);
      setDocData(doc);
      await loadQuiz();
    };
    init();

    // Cleanup: hủy stream khi rời trang (tránh tốn token)
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);
  const handleSelectOption = (qIdx, oIdx) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qIdx]: oIdx
    }));
  };
  const handleSubmit = () => {
    if (Object.keys(userAnswers).length < quiz.length) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  };
  const doSubmit = () => {
    let correctCount = 0;
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_index) correctCount++;
    });
    setScore(correctCount);
    setIsSubmitted(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  /* ── Loading state ─────────────────────────────────────── */
  if (loading) {
    return /*#__PURE__*/_jsx("div", {
      className: "flex flex-col items-center justify-center min-h-[80vh]",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col items-center gap-6 bg-[var(--card-bg)] backdrop-blur-xl px-14 py-10 rounded-[28px] border border-[var(--border-color)] shadow-[0_8px_32px_hsl(222_47%_4%/0.08)]",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "relative",
          children: [/*#__PURE__*/_jsx("div", {
            className: "absolute inset-0 rounded-2xl blur-xl opacity-40",
            style: {
              background: "radial-gradient(circle, hsl(38 92% 50%) 0%, hsl(27 96% 54%) 100%)"
            }
          }), /*#__PURE__*/_jsx("div", {
            className: "relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(38_92%_50%)] to-[hsl(27_80%_45%)] flex items-center justify-center shadow-[0_4px_16px_hsl(38_92%_50%/0.30)]",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined icon-thin text-white text-[26px]",
              children: "quiz"
            })
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "text-center space-y-1.5",
          children: [/*#__PURE__*/_jsx("p", {
            className: "text-[13px] font-bold text-[var(--foreground)]",
            children: QUIZ_PAGE_TEXTS.status.loading.title
          }), /*#__PURE__*/_jsx("p", {
            className: "text-[11px] text-[var(--muted)] font-medium",
            children: QUIZ_PAGE_TEXTS.status.loading.desc
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex items-center gap-1.5",
          children: [0, 1, 2].map(i => /*#__PURE__*/_jsx("div", {
            className: "w-1.5 h-1.5 rounded-full bg-[hsl(38_92%_50%)] animate-jumping-dot",
            style: {
              animationDelay: `${i * 0.16}s`
            }
          }, i))
        })]
      })
    });
  }

  /* ── Quota exceeded state ───────────────────────────────── */
  if (quotaExceeded) {
    return /*#__PURE__*/_jsxs("div", {
      className: "flex flex-col items-center justify-center min-h-[80vh] p-8 text-center",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-3xl flex items-center justify-center mb-6 border border-amber-400/20",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined text-[36px] text-amber-500",
          children: "bolt"
        })
      }), /*#__PURE__*/_jsx("h2", {
        className: "text-xl font-bold text-[var(--foreground)] mb-2",
        children: QUOTA_TEXTS.exceeded.title
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted)] text-[13px] mb-1",
        children: QUOTA_TEXTS.exceeded.ai
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted-light)] text-[12px] mb-6",
        children: QUOTA_TEXTS.exceeded.desc
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-3",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => navigate("/settings"),
          className: "px-6 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[13px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]",
          children: QUOTA_TEXTS.exceeded.upgradeBtn
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => navigate(-1),
          className: "px-5 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] text-[13px] font-bold border border-[var(--border-color)] hover:bg-[var(--card-bg)] transition-all active:scale-95",
          children: QUIZ_PAGE_TEXTS.status.error.back
        })]
      })]
    });
  }

  /* ── Error state ─────────────────────────────────────────── */
  if (error) {
    return /*#__PURE__*/_jsxs("div", {
      className: "flex flex-col items-center justify-center min-h-[80vh] p-8 text-center",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-20 h-20 bg-[hsl(343_85%_58%/0.08)] text-[hsl(343_72%_48%)] rounded-3xl flex items-center justify-center mb-6 border border-[hsl(343_85%_58%/0.15)]",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined icon-thin text-[36px]",
          children: "error"
        })
      }), /*#__PURE__*/_jsx("h2", {
        className: "text-xl font-bold text-[var(--foreground)] mb-2",
        children: error
      }), /*#__PURE__*/_jsx("p", {
        className: "text-[var(--muted)] text-[13px] mb-6",
        children: "Vui l\xF2ng th\u1EED t\u1EA1o l\u1EA1i ho\u1EB7c quay v\u1EC1"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-3",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => loadQuiz(true),
          className: "px-5 py-2.5 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-bold hover:bg-[hsl(239_55%_50%)] transition-all active:scale-95",
          children: "T\u1EA1o l\u1EA1i"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => navigate(-1),
          className: "px-5 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] text-[13px] font-bold border border-[var(--border-color)] hover:bg-[var(--card-bg)] transition-all active:scale-95",
          children: QUIZ_PAGE_TEXTS.status.error.back
        })]
      })]
    });
  }

  /* ── Main quiz ──────────────────────────────────────────── */
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsxs("div", {
      className: "min-h-screen bg-[var(--background)] pb-12",
      children: [/*#__PURE__*/_jsxs("header", {
        className: "sticky top-0 z-50 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--border-color)] px-6 h-16 flex items-center justify-between",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3",
          children: [/*#__PURE__*/_jsx("button", {
            onClick: () => navigate(-1),
            className: "w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all active:scale-90",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined icon-thin text-[20px]",
              children: "arrow_back"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "hidden md:block",
            children: [/*#__PURE__*/_jsx("h1", {
              className: "text-[13px] font-bold text-[var(--foreground)] truncate max-w-md leading-none",
              children: docData?.file_name
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[10px] font-bold text-[hsl(239_55%_50%)] mt-0.5",
              children: QUIZ_PAGE_TEXTS.header.badge
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-2",
          children: [/*#__PURE__*/_jsxs("button", {
            onClick: () => setShowRegenConfirm(true),
            className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-[var(--muted)] hover:text-[hsl(343_72%_48%)] hover:border-[hsl(343_85%_58%/0.25)] hover:bg-[hsl(343_85%_58%/0.04)] text-[11px] font-bold transition-all active:scale-95",
            title: "T\u1EA1o l\u1EA1i b\xE0i ki\u1EC3m tra m\u1EDBi",
            children: [/*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined icon-thin text-[14px]",
              children: "refresh"
            }), "T\u1EA1o l\u1EA1i"]
          }), isSubmitted ? /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2",
            children: [/*#__PURE__*/_jsx("div", {
              className: "px-3 py-1.5 bg-[hsl(239_68%_58%)] text-white rounded-xl text-[11px] font-bold",
              children: QUIZ_PAGE_TEXTS.header.scoreBadge(score, quiz.length)
            }), /*#__PURE__*/_jsx("button", {
              onClick: () => {
                setIsSubmitted(false);
                setUserAnswers({});
                window.scrollTo({
                  top: 0
                });
              },
              className: "px-3 py-1.5 bg-[var(--surface)] text-[var(--muted)] rounded-xl text-[11px] font-bold hover:bg-[var(--card-bg)] border border-[var(--border-color)] transition-all active:scale-95",
              children: QUIZ_PAGE_TEXTS.header.retake
            })]
          }) : /*#__PURE__*/_jsxs("div", {
            className: "text-[11px] font-bold text-[var(--muted)] bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]",
            children: [QUIZ_PAGE_TEXTS.header.completed, " / ", quiz.length]
          })]
        })]
      }), /*#__PURE__*/_jsxs("main", {
        className: "max-w-3xl mx-auto px-6 pt-8 pb-4 space-y-10",
        children: [isSubmitted && /*#__PURE__*/_jsxs("div", {
          className: "bg-[var(--card-bg)] rounded-3xl p-8 border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row items-center gap-8",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "relative shrink-0",
            children: [/*#__PURE__*/_jsxs("svg", {
              className: "w-24 h-24 transform -rotate-90",
              children: [/*#__PURE__*/_jsx("circle", {
                cx: "48",
                cy: "48",
                r: "42",
                stroke: "currentColor",
                strokeWidth: "6",
                fill: "transparent",
                className: "text-[var(--surface)]"
              }), /*#__PURE__*/_jsx("circle", {
                cx: "48",
                cy: "48",
                r: "42",
                stroke: "currentColor",
                strokeWidth: "6",
                fill: "transparent",
                strokeDasharray: 263.8,
                strokeDashoffset: 263.8 - 263.8 * score / quiz.length,
                strokeLinecap: "round",
                className: "text-[hsl(239_68%_58%)] transition-all duration-1000"
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "absolute inset-0 flex flex-col items-center justify-center",
              children: /*#__PURE__*/_jsxs("span", {
                className: "text-xl font-bold text-[var(--foreground)]",
                children: [Math.round(score / quiz.length * 100), "%"]
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1 space-y-3 text-center md:text-left",
            children: [/*#__PURE__*/_jsx("h2", {
              className: "font-display text-2xl text-[hsl(222_47%_10%)] dark:text-white",
              children: QUIZ_PAGE_TEXTS.results.title
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[var(--muted)] text-[14px] font-medium leading-relaxed",
              children: score === quiz.length ? QUIZ_PAGE_TEXTS.results.perfect : score > quiz.length / 2 ? QUIZ_PAGE_TEXTS.results.good : QUIZ_PAGE_TEXTS.results.keepTrying
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex flex-wrap justify-center md:justify-start gap-3 pt-1",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "bg-[hsl(158_64%_44%/0.08)] px-3 py-1.5 rounded-xl border border-[hsl(158_64%_44%/0.20)] flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-2 h-2 rounded-full bg-[hsl(158_64%_44%)]"
                }), /*#__PURE__*/_jsxs("span", {
                  className: "font-bold text-[12px] text-[hsl(158_55%_36%)]",
                  children: [score, " ", QUIZ_PAGE_TEXTS.results.correct]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "bg-[hsl(343_85%_58%/0.08)] px-3 py-1.5 rounded-xl border border-[hsl(343_85%_58%/0.20)] flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-2 h-2 rounded-full bg-[hsl(343_85%_58%)]"
                }), /*#__PURE__*/_jsxs("span", {
                  className: "font-bold text-[12px] text-[hsl(343_72%_48%)]",
                  children: [quiz.length - score, " ", QUIZ_PAGE_TEXTS.results.incorrect]
                })]
              })]
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "space-y-8",
          children: quiz.filter(item => item?.question && Array.isArray(item?.options)).map((item, qIdx) => /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("h3", {
              className: "text-[15px] font-bold text-[var(--foreground)] leading-snug",
              children: [/*#__PURE__*/_jsxs("span", {
                className: "text-[hsl(239_55%_50%)] mr-2",
                children: ["C\xE2u ", qIdx + 1, ":"]
              }), item.question]
            }), /*#__PURE__*/_jsxs("div", {
              className: "grid grid-cols-1 gap-2.5 md:pl-10",
              children: [(Array.isArray(item.options) ? item.options : []).map((opt, oIdx) => {
                const isSelected = userAnswers[qIdx] === oIdx;
                const isCorrect = oIdx === item.correct_index;
                const showResult = isSubmitted;
                let cardCls = "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-[hsl(239_68%_58%/0.40)] cursor-pointer";
                if (isSelected && !showResult) cardCls = "bg-[hsl(239_68%_58%/0.05)] border-[hsl(239_68%_58%)] ring-1 ring-[hsl(239_68%_58%/0.10)]";
                if (showResult) {
                  if (isCorrect) cardCls = "bg-[hsl(158_64%_44%/0.06)] border-[hsl(158_64%_44%/0.40)] cursor-default";else if (isSelected) cardCls = "bg-[hsl(343_85%_58%/0.06)] border-[hsl(343_85%_58%/0.40)] cursor-default";else cardCls = "bg-[var(--card-bg)] border-[var(--border-subtle)] opacity-50 cursor-default";
                }
                return /*#__PURE__*/_jsxs("div", {
                  onClick: () => handleSelectOption(qIdx, oIdx),
                  className: `group p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3.5 ${cardCls}`,
                  children: [/*#__PURE__*/_jsx("div", {
                    className: `w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${showResult ? isCorrect ? "border-[hsl(158_64%_44%)] bg-[hsl(158_64%_44%)]" : isSelected ? "border-[hsl(343_85%_58%)] bg-[hsl(343_85%_58%)]" : "border-[var(--border-color)]" : isSelected ? "border-[hsl(239_68%_58%)] bg-[hsl(239_68%_58%)]" : "border-[var(--border-color)] group-hover:border-[hsl(239_68%_58%/0.50)]"}`,
                    children: showResult ? isCorrect ? /*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined text-[12px] text-white",
                      children: "check"
                    }) : isSelected ? /*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined text-[12px] text-white",
                      children: "close"
                    }) : null : isSelected && /*#__PURE__*/_jsx("div", {
                      className: "w-1.5 h-1.5 bg-white rounded-full"
                    })
                  }), /*#__PURE__*/_jsx("span", {
                    className: `text-[13px] font-medium leading-relaxed ${showResult ? isCorrect ? "text-[hsl(158_55%_36%)]" : isSelected ? "text-[hsl(343_72%_48%)]" : "text-[var(--muted)]" : isSelected ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)]"}`,
                    children: opt
                  })]
                }, oIdx);
              }), isSubmitted && /*#__PURE__*/_jsxs("div", {
                className: "mt-4 p-5 bg-[hsl(239_68%_58%/0.05)] rounded-2xl border border-[hsl(239_68%_58%/0.15)]",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex items-center gap-2 mb-3",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "w-7 h-7 rounded-lg bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] flex items-center justify-center",
                    children: /*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined icon-thin text-[16px]",
                      children: "lightbulb"
                    })
                  }), /*#__PURE__*/_jsx("h4", {
                    className: "text-[10px] font-bold text-[hsl(239_55%_50%)] uppercase tracking-wider",
                    children: QUIZ_PAGE_TEXTS.results.expertExplanation
                  })]
                }), /*#__PURE__*/_jsx("p", {
                  className: "text-[var(--foreground)] text-[13px] leading-loose font-medium",
                  children: item.explanation
                })]
              })]
            })]
          }, qIdx))
        }), !isSubmitted && /*#__PURE__*/_jsx("div", {
          className: "pt-4 text-center",
          children: /*#__PURE__*/_jsx("button", {
            onClick: handleSubmit,
            className: "px-8 py-3 bg-gradient-to-br from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white rounded-2xl font-bold text-[13px] shadow-[0_4px_16px_hsl(239_68%_58%/0.25)] hover:scale-105 active:scale-95 transition-all",
            children: QUIZ_PAGE_TEXTS.actions.submit
          })
        })]
      })]
    }), /*#__PURE__*/_jsx(ConfirmDialog, {
      open: showSubmitConfirm,
      title: "N\u1ED9p b\xE0i ch\u01B0a ho\xE0n th\xE0nh",
      message: `Bạn còn ${quiz.length - Object.keys(userAnswers).length} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`,
      confirmLabel: "N\u1ED9p b\xE0i",
      cancelLabel: "Ti\u1EBFp t\u1EE5c l\xE0m",
      variant: "warning",
      onConfirm: () => {
        setShowSubmitConfirm(false);
        doSubmit();
      },
      onCancel: () => setShowSubmitConfirm(false)
    }), /*#__PURE__*/_jsx(ConfirmDialog, {
      open: showRegenConfirm,
      title: "T\u1EA1o l\u1EA1i b\xE0i ki\u1EC3m tra",
      message: "AI s\u1EBD t\u1EA1o m\u1ED9t b\u1ED9 c\xE2u h\u1ECFi m\u1EDBi ho\xE0n to\xE0n kh\xE1c. Ti\u1EBFn tr\xECnh l\xE0m b\xE0i hi\u1EC7n t\u1EA1i s\u1EBD b\u1ECB m\u1EA5t.",
      confirmLabel: "T\u1EA1o l\u1EA1i",
      cancelLabel: "Gi\u1EEF l\u1EA1i",
      variant: "info",
      onConfirm: () => {
        setShowRegenConfirm(false);
        loadQuiz(true);
      },
      onCancel: () => setShowRegenConfirm(false)
    })]
  });
}