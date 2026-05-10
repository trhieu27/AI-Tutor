import React, { useState, useRef, useEffect, useCallback } from "react";
import { HELP_PAGE_TEXTS } from "@/constants/texts";
import { authFetch } from "@/services/api.service";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const API = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1";

/* ── Animated collapse ────────────────────────────────────────────────────── */
function AnimatedCollapse({
  open,
  children
}) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) setHeight(open ? ref.current.scrollHeight : 0);
  }, [open, children]);
  return /*#__PURE__*/_jsx("div", {
    style: {
      height,
      opacity: open ? 1 : 0
    },
    className: "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
    children: /*#__PURE__*/_jsx("div", {
      ref: ref,
      children: children
    })
  });
}

/* ── Toast ────────────────────────────────────────────────────────────────── */
function Toast({
  show,
  message,
  onClose
}) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);
  if (!show) return null;
  return /*#__PURE__*/_jsx("div", {
    className: "fixed bottom-8 right-8 z-[200] animate-dialog-enter",
    children: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-3 px-5 py-3.5 bg-[hsl(158_64%_30%)] text-white rounded-2xl shadow-xl border border-[hsl(158_64%_44%/0.30)]",
      children: [/*#__PURE__*/_jsx("span", {
        className: "material-symbols-outlined",
        style: {
          fontSize: 18
        },
        children: "check_circle"
      }), /*#__PURE__*/_jsx("span", {
        className: "text-[13px] font-semibold",
        children: message
      }), /*#__PURE__*/_jsx("button", {
        onClick: onClose,
        className: "ml-1 opacity-70 hover:opacity-100 transition-opacity",
        children: /*#__PURE__*/_jsx("span", {
          className: "material-symbols-outlined",
          style: {
            fontSize: 14
          },
          children: "close"
        })
      })]
    })
  });
}

/* ── Data ─────────────────────────────────────────────────────────────────── */
const T = HELP_PAGE_TEXTS;
const TABS = [{
  id: "faq",
  label: T.tabs.faq,
  icon: "quiz"
}, {
  id: "guide",
  label: T.tabs.guide,
  icon: "menu_book"
}, {
  id: "contact",
  label: T.tabs.contact,
  icon: "support_agent"
}];
const faqs = T.faq.items;
const guideSteps = T.guide.steps;

/* ══════════════════════════════════════════════════════════════════════════ */
export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("faq");
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeGuide, setActiveGuide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [faqCategory, setFaqCategory] = useState(T.faq.allCategory);
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: ""
  });
  const [formErrors, setFormErrors] = useState({
    subject: "",
    message: ""
  });
  const [showToast, setShowToast] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const faqCategories = [T.faq.allCategory, ...Array.from(new Set(faqs.map(f => f.category)))];
  const filteredFaqs = faqs.filter(f => {
    const q = searchQuery.toLowerCase();
    return (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) && (faqCategory === T.faq.allCategory || f.category === faqCategory);
  });
  const handleSubmit = useCallback(async () => {
    const errs = {
      subject: "",
      message: ""
    };
    if (!contactForm.subject.trim()) errs.subject = T.contact.errors.subjectRequired;
    if (!contactForm.message.trim()) errs.message = T.contact.errors.messageRequired;else if (contactForm.message.length < 20) errs.message = T.contact.errors.messageMinLength;
    setFormErrors(errs);
    if (errs.subject || errs.message) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await authFetch(`${API}/users/support`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: contactForm.subject,
          message: contactForm.message
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gửi thất bại, vui lòng thử lại");
      }
      setShowToast(true);
      setContactForm({
        subject: "",
        message: ""
      });
      setFormErrors({
        subject: "",
        message: ""
      });
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [contactForm]);

  /* ── input shared styles ──────────────────────────────────────────────── */
  const inputCls = "w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all";
  const inputErrCls = "w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[hsl(343_85%_58%/0.50)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(343_72%_48%/0.20)] transition-all";
  return /*#__PURE__*/_jsxs("div", {
    className: "min-h-screen bg-[var(--background)]",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "max-w-5xl mx-auto px-6 py-10 space-y-8",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "space-y-1",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "font-display text-[28px] font-semibold text-[var(--foreground)] tracking-tight",
          children: "Tr\u1EE3 gi\xFAp"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[13px] text-[var(--muted)]",
          children: "C\xE2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p, h\u01B0\u1EDBng d\u1EABn s\u1EED d\u1EE5ng v\xE0 li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3"
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "flex gap-1 p-1 bg-[var(--surface)] rounded-2xl border border-[var(--border-color)]",
        children: TABS.map(tab => /*#__PURE__*/_jsxs("button", {
          onClick: () => setActiveTab(tab.id),
          className: `flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex-1 justify-center ${activeTab === tab.id ? "bg-[var(--card-bg)] text-[hsl(239_55%_50%)] shadow-sm border border-[var(--border-color)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`,
          children: [/*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined",
            style: {
              fontSize: 17,
              fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0"
            },
            children: tab.icon
          }), /*#__PURE__*/_jsx("span", {
            className: "hidden sm:inline",
            children: tab.label
          })]
        }, tab.id))
      }), /*#__PURE__*/_jsxs("div", {
        className: "animate-dialog-enter min-h-[480px]",
        children: [activeTab === "faq" && /*#__PURE__*/_jsxs("div", {
          className: "space-y-5",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex flex-col sm:flex-row gap-3",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "relative flex-1",
              children: [/*#__PURE__*/_jsxs("svg", {
                className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]",
                width: "15",
                height: "15",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                children: [/*#__PURE__*/_jsx("circle", {
                  cx: "11",
                  cy: "11",
                  r: "8"
                }), /*#__PURE__*/_jsx("path", {
                  d: "m21 21-4.35-4.35"
                })]
              }), /*#__PURE__*/_jsx("input", {
                value: searchQuery,
                onChange: e => setSearchQuery(e.target.value),
                placeholder: T.faq.searchPlaceholder,
                className: "w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[hsl(239_68%_58%/0.30)] transition-all"
              }), searchQuery && /*#__PURE__*/_jsx("button", {
                onClick: () => setSearchQuery(""),
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined",
                  style: {
                    fontSize: 14
                  },
                  children: "close"
                })
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "flex gap-1.5 flex-wrap",
              children: faqCategories.map(cat => /*#__PURE__*/_jsx("button", {
                onClick: () => setFaqCategory(cat),
                className: `px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${faqCategory === cat ? "bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_55%_50%)] border border-[hsl(239_68%_58%/0.25)]" : "bg-[var(--card-bg)] text-[var(--muted)] border border-[var(--border-color)] hover:text-[var(--foreground)]"}`,
                children: cat
              }, cat))
            })]
          }), /*#__PURE__*/_jsx("div", {
            className: "space-y-2",
            children: filteredFaqs.length === 0 ? /*#__PURE__*/_jsxs("div", {
              className: "py-16 text-center space-y-3",
              children: [/*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined text-[40px] text-[var(--muted)]",
                children: "search_off"
              }), /*#__PURE__*/_jsxs("p", {
                className: "text-[13px] text-[var(--muted)]",
                children: ["Kh\xF4ng t\xECm th\u1EA5y k\u1EBFt qu\u1EA3 cho \"", searchQuery, "\""]
              }), /*#__PURE__*/_jsx("button", {
                onClick: () => {
                  setSearchQuery("");
                  setFaqCategory(T.faq.allCategory);
                },
                className: "text-[12px] font-semibold text-[hsl(239_55%_50%)] hover:underline",
                children: T.faq.clearFilter
              })]
            }) : filteredFaqs.map(faq => {
              const idx = faqs.indexOf(faq);
              const open = activeFaq === idx;
              return /*#__PURE__*/_jsxs("div", {
                className: `rounded-2xl border transition-all overflow-hidden ${open ? "border-[hsl(239_68%_58%/0.30)] bg-[hsl(239_68%_58%/0.04)]" : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[hsl(239_68%_58%/0.20)]"}`,
                children: [/*#__PURE__*/_jsxs("button", {
                  onClick: () => setActiveFaq(open ? null : idx),
                  className: "w-full px-5 py-4 flex items-center gap-4 text-left group",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${open ? "bg-[hsl(239_68%_58%)] text-white" : "bg-[var(--surface)] text-[var(--muted)] group-hover:text-[hsl(239_55%_50%)]"}`,
                    children: /*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined",
                      style: {
                        fontSize: 17,
                        fontVariationSettings: "'wght' 300"
                      },
                      children: faq.icon
                    })
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "flex-1 min-w-0",
                    children: [/*#__PURE__*/_jsx("p", {
                      className: `text-[13px] font-semibold ${open ? "text-[hsl(239_55%_50%)]" : "text-[var(--foreground)] group-hover:text-[hsl(239_55%_50%)]"} transition-colors`,
                      children: faq.question
                    }), /*#__PURE__*/_jsx("p", {
                      className: "text-[11px] text-[var(--muted)] mt-0.5",
                      children: faq.category
                    })]
                  }), /*#__PURE__*/_jsx("span", {
                    className: `material-symbols-outlined text-[var(--muted)] transition-transform duration-300 ${open ? "rotate-180 text-[hsl(239_55%_50%)]" : ""}`,
                    style: {
                      fontSize: 18
                    },
                    children: "expand_more"
                  })]
                }), /*#__PURE__*/_jsx(AnimatedCollapse, {
                  open: open,
                  children: /*#__PURE__*/_jsxs("div", {
                    className: "px-5 pb-5",
                    children: [/*#__PURE__*/_jsx("div", {
                      className: "h-px bg-[var(--border-subtle)] mb-4 ml-[52px]"
                    }), /*#__PURE__*/_jsx("p", {
                      className: "text-[13px] text-[var(--muted)] leading-[1.7] ml-[52px]",
                      children: faq.answer
                    })]
                  })
                })]
              }, idx);
            })
          })]
        }), activeTab === "guide" && /*#__PURE__*/_jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-5 gap-6",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "lg:col-span-2 space-y-1.5",
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3",
              children: T.guide.stepsLabel
            }), guideSteps.map((step, idx) => /*#__PURE__*/_jsxs("button", {
              onClick: () => setActiveGuide(idx),
              className: `w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left ${activeGuide === idx ? "bg-[var(--card-bg)] border border-[hsl(239_68%_58%/0.25)] shadow-sm" : "border border-transparent hover:bg-[var(--surface)]"}`,
              children: [/*#__PURE__*/_jsx("div", {
                className: `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${activeGuide === idx ? `bg-gradient-to-br ${step.color} text-white shadow-md` : "bg-[var(--surface)] text-[var(--muted)]"}`,
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined",
                  style: {
                    fontSize: 17
                  },
                  children: step.icon
                })
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1 min-w-0",
                children: /*#__PURE__*/_jsxs("p", {
                  className: `text-[13px] font-semibold ${activeGuide === idx ? "text-[var(--foreground)]" : "text-[var(--muted)]"} transition-colors`,
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "text-[hsl(239_55%_50%)] mr-1.5",
                    children: String(idx + 1).padStart(2, "0")
                  }), step.title]
                })
              }), activeGuide === idx && /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined text-[hsl(239_55%_50%)] shrink-0",
                style: {
                  fontSize: 16
                },
                children: "arrow_forward"
              })]
            }, idx))]
          }), /*#__PURE__*/_jsx("div", {
            className: "lg:col-span-3",
            children: /*#__PURE__*/_jsxs("div", {
              className: "animate-dialog-enter p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-5",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-4",
                children: [/*#__PURE__*/_jsx("div", {
                  className: `w-12 h-12 rounded-2xl bg-gradient-to-br ${guideSteps[activeGuide].color} flex items-center justify-center text-white shadow-lg`,
                  children: /*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 22
                    },
                    children: guideSteps[activeGuide].icon
                  })
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("p", {
                    className: "text-[11px] font-semibold text-[hsl(239_55%_50%)] mb-0.5",
                    children: [T.guide.stepLabel, " ", activeGuide + 1, " / ", guideSteps.length]
                  }), /*#__PURE__*/_jsx("h3", {
                    className: "font-display text-[18px] font-semibold text-[var(--foreground)] tracking-tight",
                    children: guideSteps[activeGuide].title
                  })]
                })]
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[13px] text-[var(--muted)] leading-[1.75]",
                children: guideSteps[activeGuide].description
              }), /*#__PURE__*/_jsx("div", {
                className: "flex items-center gap-1.5 pt-1",
                children: guideSteps.map((_, i) => /*#__PURE__*/_jsx("button", {
                  onClick: () => setActiveGuide(i),
                  className: `h-1.5 rounded-full transition-all duration-300 ${i === activeGuide ? "bg-[hsl(239_68%_58%)] w-8" : i < activeGuide ? "bg-[hsl(239_68%_58%/0.35)] w-3" : "bg-[var(--border-color)] w-3"}`
                }, i))
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between pt-1",
                children: [/*#__PURE__*/_jsxs("button", {
                  onClick: () => setActiveGuide(Math.max(0, activeGuide - 1)),
                  disabled: activeGuide === 0,
                  className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--muted)] border border-[var(--border-color)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 14
                    },
                    children: "arrow_back"
                  }), T.guide.prevButton]
                }), /*#__PURE__*/_jsxs("button", {
                  onClick: () => setActiveGuide(Math.min(guideSteps.length - 1, activeGuide + 1)),
                  disabled: activeGuide === guideSteps.length - 1,
                  className: "flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-[hsl(239_68%_58%)] text-white hover:bg-[hsl(239_55%_50%)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95",
                  children: [T.guide.nextButton, /*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 14
                    },
                    children: "arrow_forward"
                  })]
                })]
              })]
            }, activeGuide)
          })]
        }), activeTab === "contact" && /*#__PURE__*/_jsx("div", {
          className: "max-w-lg mx-auto",
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-7 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-5",
            children: [/*#__PURE__*/_jsx("div", {
              children: /*#__PURE__*/_jsx("h3", {
                className: "text-[15px] font-semibold text-[var(--foreground)]",
                children: T.contact.formTitle
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "space-y-4",
              children: [/*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsxs("label", {
                  className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
                  children: [T.contact.subjectLabel, " ", /*#__PURE__*/_jsx("span", {
                    className: "text-[hsl(343_72%_48%)]",
                    children: "*"
                  })]
                }), /*#__PURE__*/_jsx("input", {
                  value: contactForm.subject,
                  onChange: e => {
                    setContactForm(p => ({
                      ...p,
                      subject: e.target.value
                    }));
                    if (formErrors.subject) setFormErrors(p => ({
                      ...p,
                      subject: undefined
                    }));
                  },
                  placeholder: T.contact.subjectPlaceholder,
                  className: formErrors.subject ? inputErrCls : inputCls
                }), formErrors.subject && /*#__PURE__*/_jsxs("p", {
                  className: "text-[11px] text-[hsl(343_72%_48%)] mt-1 flex items-center gap-1",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 12
                    },
                    children: "error"
                  }), formErrors.subject]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsxs("label", {
                  className: "block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5",
                  children: [T.contact.messageLabel, " ", /*#__PURE__*/_jsx("span", {
                    className: "text-[hsl(343_72%_48%)]",
                    children: "*"
                  })]
                }), /*#__PURE__*/_jsx("textarea", {
                  value: contactForm.message,
                  rows: 5,
                  onChange: e => {
                    setContactForm(p => ({
                      ...p,
                      message: e.target.value
                    }));
                    if (formErrors.message) setFormErrors(p => ({
                      ...p,
                      message: undefined
                    }));
                  },
                  placeholder: T.contact.messagePlaceholder,
                  className: `${formErrors.message ? inputErrCls : inputCls} resize-none`
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between mt-1",
                  children: [formErrors.message ? /*#__PURE__*/_jsxs("p", {
                    className: "text-[11px] text-[hsl(343_72%_48%)] flex items-center gap-1",
                    children: [/*#__PURE__*/_jsx("span", {
                      className: "material-symbols-outlined",
                      style: {
                        fontSize: 12
                      },
                      children: "error"
                    }), formErrors.message]
                  }) : /*#__PURE__*/_jsx("span", {}), /*#__PURE__*/_jsxs("p", {
                    className: "text-[10px] text-[var(--muted)]",
                    children: [contactForm.message.length, " ", T.contact.charCount]
                  })]
                })]
              }), /*#__PURE__*/_jsx("button", {
                onClick: handleSubmit,
                disabled: submitting,
                className: "w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(239_68%_58%)] text-white text-[13px] font-semibold hover:bg-[hsl(239_55%_50%)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                children: submitting ? /*#__PURE__*/_jsxs(_Fragment, {
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  }), "\u0110ang g\u1EEDi..."]
                }) : /*#__PURE__*/_jsxs(_Fragment, {
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 17
                    },
                    children: "send"
                  }), T.contact.submitButton]
                })
              }), submitError && /*#__PURE__*/_jsxs("p", {
                className: "text-[12px] text-[hsl(343_72%_48%)] flex items-center gap-1.5 font-semibold",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined",
                  style: {
                    fontSize: 14
                  },
                  children: "error"
                }), submitError]
              })]
            })]
          })
        })]
      }, activeTab)]
    }), /*#__PURE__*/_jsx(Toast, {
      show: showToast,
      message: T.contact.successToast,
      onClose: () => setShowToast(false)
    })]
  });
}