import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchDocument, fetchChatSessions, fetchSessionDetail, askQuestion, fetchDocumentSummaryStream, fetchDocumentQuizStream, fetchDocumentStudyQuestionsStream, fetchDocumentQuiz, deleteChatSession, fetchQuota, QuotaError } from "@/services/api.service";
import { CHAT_TEXTS, QUOTA_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ChatPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = params.documentId;
  const initialAction = searchParams.get("action");
  const [docData, setDocData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop: mở history mặc định
  useEffect(() => {
    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
  }, []);
  const [summary, setSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [studyQuestions, setStudyQuestions] = useState(null);
  const [isStudyQuestionsLoading, setIsStudyQuestionsLoading] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [quota, setQuota] = useState(null);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const typewriterIntervalRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollToBottom = (force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (force || isAtBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Track whether user is near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const {
        scrollTop,
        scrollHeight,
        clientHeight
      } = container;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    };
    container.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const doc = await fetchDocument(documentId);
        setDocData(doc);
        const docSessions = await fetchChatSessions(documentId);
        setSessions(docSessions);
        if (docSessions.length > 0) loadSession(docSessions[0].id);
        if (initialAction === "quiz") handleGetQuiz();else if (initialAction === "summary") handleGetSummary();else if (initialAction === "questions") handleGetStudyQuestions();
        // Load quota
        fetchQuota().then(setQuota).catch(() => {});
      } catch (error) {
        console.error("Error loading chat data:", error);
      }
    };
    loadInitialData();
    return () => {
      abortControllerRef.current?.abort();
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    };
  }, [documentId]);
  const loadSession = async sessionId => {
    try {
      const detail = await fetchSessionDetail(sessionId);
      setMessages(detail.messages);
      setCurrentSessionId(sessionId);
      // Ẩn sidebar khi chọn session trên mobile
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };
  const handleSendMessage = async (e = null) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || "",
      role: "user",
      content: input,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    // Force scroll to bottom when user sends a message
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(true), 50);
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await askQuestion(documentId, {
        question: input,
        session_id: currentSessionId || undefined
      }, controller.signal);
      if (!currentSessionId) {
        setCurrentSessionId(response.session_id);
        const updatedSessions = await fetchChatSessions(documentId);
        setSessions(updatedSessions);
      }
      const fullContent = response.message.content;
      const assistantId = response.message.id;
      setStreamingMsgId(assistantId);
      setMessages(prev => [...prev, {
        ...response.message,
        content: ""
      }]);
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < fullContent.length) {
          const nextChar = fullContent[currentIdx];
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantId) {
              return [...prev.slice(0, -1), {
                ...last,
                content: last.content + nextChar
              }];
            }
            return prev;
          });
          currentIdx++;
          // Only auto-scroll during typewriter if user is near bottom
          if (isAtBottom) scrollToBottom();
        } else {
          stopTypewriter();
        }
      }, 10);
      typewriterIntervalRef.current = interval;
    } catch (error) {
      if (error.name === "AbortError") return;
      if (error instanceof QuotaError) {
        // Remove the user's unanswered message & show upgrade modal
        setMessages(prev => prev.slice(0, -1));
        setQuotaExceeded("chat");
        setIsLoading(false);
        abortControllerRef.current = null;
        return;
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: error.message || "Đã xảy ra lỗi không xác định.",
        created_at: new Date().toISOString()
      }]);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };
  const stopTypewriter = () => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    setStreamingMsgId(null);
    setIsLoading(false);
    abortControllerRef.current = null;
    // Refresh quota sau khi AI trả lời xong
    fetchQuota().then(setQuota).catch(() => {});
  };
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
      setIsLoading(false);
      return;
    }
    if (isLoading) {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: "_Đã hủy yêu cầu._",
        created_at: new Date().toISOString()
      }]);
    }
  };
  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    // Ẩn sidebar khi tạo chat mới trên mobile
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };
  const handleDeleteSession = async sessionId => {
    if (!confirm("Xóa phiên thảo luận này?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) startNewChat();
    } catch (error) {
      console.error(error);
    }
  };
  const handleGetSummary = async () => {
    setIsSummaryLoading(true);
    setShowModal("summary");
    setSummary("");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await fetchDocumentSummaryStream(documentId, chunk => {
        setIsSummaryLoading(false);
        setSummary(prev => (prev || "") + chunk);
      }, controller.signal);
    } catch (error) {
      if (error.name === "AbortError") return;
      if (error instanceof QuotaError) {
        setQuotaExceeded("ai");
        setShowModal(null);
        return;
      }
      setSummary(prev => (prev || "") + "\n\n_Dừng tóm tắt._");
    } finally {
      setIsSummaryLoading(false);
      abortControllerRef.current = null;
    }
  };
  const handleGetQuiz = async () => {
    setIsQuizLoading(true);
    setShowModal("quiz");
    setQuiz([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulated = "";
    try {
      await fetchDocumentQuizStream(documentId, chunk => {
        accumulated += chunk;
      }, false, controller.signal);
      try {
        let jsonStr = accumulated.trim();
        if (jsonStr.includes("```json")) jsonStr = jsonStr.split("```json")[1].split("```")[0];else if (jsonStr.includes("```")) jsonStr = jsonStr.split("```")[1].split("```")[0];
        const parsed = JSON.parse(jsonStr.trim());
        setQuiz(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        const data = await fetchDocumentQuiz(documentId, controller.signal);
        setQuiz(data);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      if (error instanceof QuotaError) {
        setQuotaExceeded("ai");
        setShowModal(null);
        return;
      }
    } finally {
      setIsQuizLoading(false);
      abortControllerRef.current = null;
    }
  };
  const handleGetStudyQuestions = async () => {
    setIsStudyQuestionsLoading(true);
    setShowModal("questions");
    setStudyQuestions([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulated = "";
    try {
      await fetchDocumentStudyQuestionsStream(documentId, chunk => {
        setIsStudyQuestionsLoading(false);
        accumulated += chunk;
        const lines = accumulated.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(l => l.length > 5);
        setStudyQuestions(lines);
      }, controller.signal);
    } catch (error) {
      if (error.name === "AbortError") return;
      if (error instanceof QuotaError) {
        setQuotaExceeded("ai");
        setShowModal(null);
        return;
      }
    } finally {
      setIsStudyQuestionsLoading(false);
      abortControllerRef.current = null;
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return /*#__PURE__*/_jsxs("div", {
    className: "flex h-full overflow-hidden font-sans bg-[var(--background)] relative",
    children: [isSidebarOpen && /*#__PURE__*/_jsx("div", {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden",
      onClick: () => setIsSidebarOpen(false)
    }), /*#__PURE__*/_jsxs("aside", {
      className: `flex flex-col z-[70] border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
          fixed inset-y-0 left-0 w-[260px] h-full
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:inset-y-auto lg:left-auto lg:translate-x-0 lg:shrink-0 lg:h-full
          ${isSidebarOpen ? 'lg:w-60' : 'lg:w-0 lg:border-0'}`,
      children: [/*#__PURE__*/_jsxs("div", {
        className: "px-4 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0",
        children: [/*#__PURE__*/_jsxs("span", {
          className: "text-[11px] font-semibold text-[var(--muted-light)] uppercase tracking-[0.08em]",
          children: [sessions.length, " cu\u1ED9c h\u1ED9i tho\u1EA1i"]
        }), /*#__PURE__*/_jsx("button", {
          onClick: startNewChat,
          title: CHAT_TEXTS.SIDEBAR.NEW_CHAT_TOOLTIP,
          className: "w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-all",
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined text-[17px]",
            children: "edit_square"
          })
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar",
        children: sessions.length === 0 ? /*#__PURE__*/_jsx("div", {
          className: "py-14 text-center",
          children: /*#__PURE__*/_jsx("p", {
            className: "text-[12px] text-[#9CA3AF] dark:text-white/20 font-medium",
            children: CHAT_TEXTS.SIDEBAR.NO_SESSIONS
          })
        }) : sessions.map(session => /*#__PURE__*/_jsxs("div", {
          className: "relative group",
          children: [/*#__PURE__*/_jsxs("button", {
            onClick: () => loadSession(session.id),
            className: `w-full text-left px-3 py-2.5 rounded-lg transition-all ${currentSessionId === session.id ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm border border-[var(--border-color)]" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`,
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-[12.5px] font-medium truncate pr-5 leading-snug",
              children: session.title || "Cuộc trò chuyện mới"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-[10.5px] text-[var(--muted-light)] mt-0.5",
              children: new Date(session.updated_at).toLocaleDateString("vi-VN")
            })]
          }), /*#__PURE__*/_jsx("button", {
            onClick: e => {
              e.stopPropagation();
              handleDeleteSession(session.id);
            },
            className: "absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[#9CA3AF] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[13px]",
              children: "delete"
            })
          })]
        }, session.id))
      })]
    }), /*#__PURE__*/_jsxs("main", {
      className: "flex-1 flex flex-col h-full min-w-0 bg-[var(--background)] relative",
      children: [/*#__PURE__*/_jsxs("header", {
        className: "h-14 border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-xl flex items-center justify-between px-5 shrink-0",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3 min-w-0",
          children: [/*#__PURE__*/_jsx("button", {
            onClick: () => setIsSidebarOpen(!isSidebarOpen),
            className: "w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-all",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[20px]",
              children: isSidebarOpen ? "menu_open" : "menu"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "min-w-0",
            children: [/*#__PURE__*/_jsx("h1", {
              className: "text-[13.5px] font-semibold text-[var(--foreground)] truncate tracking-[-0.02em] max-w-[220px] md:max-w-sm",
              style: {
                fontFamily: "var(--font-serif)"
              },
              title: docData?.file_name,
              children: docData?.file_name || CHAT_TEXTS.HEADER.LOADING_DOC
            }), docData && /*#__PURE__*/_jsxs("p", {
              className: "hidden sm:block text-[11px] text-[var(--muted-light)] whitespace-nowrap",
              children: [docData.file_size_mb?.toFixed?.(1) ?? "—", " MB \xB7 ", docData.page_count, " trang"]
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex items-center gap-0.5 shrink-0",
          children: [{
            onClick: handleGetSummary,
            icon: "summarize",
            label: CHAT_TEXTS.HEADER.ACTIONS.SUMMARY
          }, {
            onClick: () => navigate(`/quiz/${documentId}`),
            icon: "quiz",
            label: CHAT_TEXTS.HEADER.ACTIONS.QUIZ
          }, {
            onClick: () => navigate(`/mindmap/${documentId}`),
            icon: "hub",
            label: CHAT_TEXTS.HEADER.ACTIONS.MINDMAP
          }].map((btn, i) => /*#__PURE__*/_jsxs("button", {
            onClick: btn.onClick,
            title: btn.label,
            className: "flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-all",
            children: [/*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[16px]",
              children: btn.icon
            }), /*#__PURE__*/_jsx("span", {
              className: "hidden sm:inline text-[11.5px]",
              children: btn.label
            })]
          }, i))
        })]
      }), /*#__PURE__*/_jsxs("div", {
        ref: messagesContainerRef,
        className: "flex-1 overflow-y-auto custom-scrollbar relative",
        children: [/*#__PURE__*/_jsx("div", {
          className: "max-w-2xl mx-auto px-6 md:px-4 py-10",
          children: messages.length === 0 ?
          /*#__PURE__*/
          /* Welcome */
          _jsxs("div", {
            className: "flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500 pt-12",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.05] flex items-center justify-center",
              children: /*#__PURE__*/_jsx("span", {
                className: "material-symbols-outlined text-[20px] text-[#9CA3AF] dark:text-white/30",
                children: "auto_stories"
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "space-y-2",
              children: [/*#__PURE__*/_jsx("h2", {
                className: "text-[20px] font-semibold text-[#1F2937] dark:text-white tracking-[-0.02em]",
                style: {
                  fontFamily: "var(--font-serif)"
                },
                children: CHAT_TEXTS.WELCOME.TITLE
              }), /*#__PURE__*/_jsx("p", {
                className: "text-[13px] text-[#6B7280] dark:text-white/35 leading-relaxed max-w-sm",
                children: CHAT_TEXTS.WELCOME.SUBTITLE
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg",
              children: CHAT_TEXTS.WELCOME.SUGGESTIONS.map(q => /*#__PURE__*/_jsx("button", {
                onClick: () => setInput(q),
                className: "p-3 text-left text-[12px] text-[#374151] dark:text-white/55 bg-[#F9FAFB] dark:bg-white/[0.03] border border-[#E5E7EB] dark:border-white/[0.07] rounded-xl hover:border-[#9CA3AF] dark:hover:border-white/20 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 font-medium leading-snug",
                children: q
              }, q))
            })]
          }) : /*#__PURE__*/_jsxs("div", {
            className: "space-y-8 pb-4",
            children: [messages.map(msg => /*#__PURE__*/_jsxs("div", {
              className: `flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "flex-row-reverse" : ""}`,
              children: [/*#__PURE__*/_jsx("div", {
                className: `w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${msg.role === "user" ? "bg-[#1F2937] dark:bg-white/90" : "bg-[#F3F4F6] dark:bg-white/[0.06]"}`,
                children: /*#__PURE__*/_jsx("span", {
                  className: `material-symbols-outlined text-[16px] ${msg.role === "user" ? "text-white dark:text-[#1F2937]" : "text-[#6B7280] dark:text-white/35"}`,
                  children: msg.role === "user" ? "person" : "auto_awesome"
                })
              }), /*#__PURE__*/_jsxs("div", {
                className: `flex-1 min-w-0 ${msg.role === "user" ? "flex flex-col items-end" : ""}`,
                children: [msg.role === "assistant" && /*#__PURE__*/_jsx("p", {
                  className: "text-[10px] font-semibold text-[#9CA3AF] dark:text-white/20 mb-1.5 uppercase tracking-[0.08em]",
                  children: "AI Tr\u1EE3 l\xFD"
                }), /*#__PURE__*/_jsx("div", {
                  className: `text-[13.5px] leading-[1.75] ${msg.role === "user" ? "inline-block bg-[#1F2937] dark:bg-white/90 text-white dark:text-[#111113] px-4 py-2.5 rounded-2xl rounded-tr-sm font-medium max-w-[85%]" : "text-[#374151] dark:text-white/75 w-full"}`,
                  children: msg.role === "assistant" ? /*#__PURE__*/_jsxs("div", {
                    className: "prose prose-sm dark:prose-invert max-w-none prose-p:leading-[1.75] prose-p:text-[13.5px] prose-p:text-[#374151] dark:prose-p:text-white/70 prose-p:m-0 prose-p:mb-3 last:prose-p:mb-0 prose-headings:text-[#1F2937] dark:prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-headings:mt-5 prose-headings:mb-2 prose-strong:text-[#1F2937] dark:prose-strong:text-white prose-strong:font-semibold prose-code:text-[11.5px] prose-code:bg-[#F3F4F6] dark:prose-code:bg-white/[0.07] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[#374151] dark:prose-code:text-white/65 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#F9FAFB] dark:prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-[#E5E7EB] dark:prose-pre:border-white/[0.07] prose-pre:rounded-xl prose-blockquote:border-l-2 prose-blockquote:border-[#D1D5DB] dark:prose-blockquote:border-white/15 prose-blockquote:pl-4 prose-blockquote:text-[#6B7280] dark:prose-blockquote:text-white/35 prose-blockquote:not-italic prose-li:text-[13.5px] prose-li:text-[#374151] dark:prose-li:text-white/65 prose-li:leading-[1.7] prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:text-[12px] prose-th:font-semibold prose-th:text-[#1F2937] dark:prose-th:text-white prose-td:text-[#374151] dark:prose-td:text-white/65 prose-table:border-collapse prose-th:border prose-th:border-[#E5E7EB] dark:prose-th:border-white/[0.08] prose-td:border prose-td:border-[#F3F4F6] dark:prose-td:border-white/[0.05] prose-th:px-3 prose-td:px-3",
                    children: [/*#__PURE__*/_jsx(ReactMarkdown, {
                      remarkPlugins: [remarkGfm],
                      children: msg.content
                    }), streamingMsgId === msg.id && /*#__PURE__*/_jsx("span", {
                      className: "inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle animate-[blink_0.9s_ease-in-out_infinite]"
                    })]
                  }) : /*#__PURE__*/_jsx(ReactMarkdown, {
                    children: msg.content
                  })
                })]
              })]
            }, msg.id)), isLoading && messages[messages.length - 1]?.role !== "assistant" && /*#__PURE__*/_jsxs("div", {
              className: "flex gap-4 animate-in fade-in duration-200",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.06] flex items-center justify-center mt-0.5 shrink-0",
                children: /*#__PURE__*/_jsx("span", {
                  className: "material-symbols-outlined text-[16px] text-[#9CA3AF] dark:text-white/30",
                  children: "auto_awesome"
                })
              }), /*#__PURE__*/_jsxs("div", {
                className: "pt-1",
                children: [/*#__PURE__*/_jsx("p", {
                  className: "text-[12px] font-medium text-[#9CA3AF] dark:text-white/25 mb-2.5",
                  children: CHAT_TEXTS.MESSAGES.AI_ANALYZING
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex gap-1.5 items-center",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce [animation-delay:0.15s]"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce [animation-delay:0.3s]"
                  })]
                })]
              })]
            }), /*#__PURE__*/_jsx("div", {
              ref: messagesEndRef,
              className: "h-1"
            })]
          })
        }), !isAtBottom && /*#__PURE__*/_jsx("div", {
          className: "sticky bottom-4 z-20 flex justify-end pr-5 pointer-events-none",
          children: /*#__PURE__*/_jsx("button", {
            onClick: () => scrollToBottom(true),
            className: "pointer-events-auto w-9 h-9 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E5E7EB] dark:border-white/[0.1] shadow-lg flex items-center justify-center text-[#6B7280] dark:text-white/50 hover:text-[#1F2937] dark:hover:text-white hover:shadow-xl transition-all active:scale-90 animate-in fade-in slide-in-from-bottom-2 duration-200",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[18px]",
              children: "keyboard_arrow_down"
            })
          })
        })]
      }), /*#__PURE__*/_jsx("div", {
        style: { padding: "12px 20px 20px", flexShrink: 0 },
        children: /*#__PURE__*/_jsxs("div", {
          style: { maxWidth: 672, margin: "0 auto" },
          children: [
            /*#__PURE__*/_jsxs("form", {
              className: "chat-prompt-inner",
              onSubmit: handleSendMessage,
              children: [
                /*#__PURE__*/_jsx("textarea", {
                  ref: textareaRef,
                  value: input,
                  onChange: e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  },
                  onKeyDown: e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading) handleSendMessage();
                    }
                  },
                  rows: 1,
                  maxLength: quota?.is_pro ? undefined : 1200,
                  placeholder: CHAT_TEXTS.INPUT.PLACEHOLDER,
                  disabled: isLoading,
                  style: {
                    display: "block",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    overflowY: "auto",
                    minHeight: 52,
                    maxHeight: 160,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--foreground)",
                    fontFamily: "inherit",
                    fontWeight: 450,
                    padding: "14px 16px 4px",
                    boxSizing: "border-box",
                  }
                }),
                /*#__PURE__*/_jsxs("div", {
                  style: { display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 10px 10px 14px" },
                  children: [

                    /*#__PURE__*/_jsxs("div", {
                      style: { display: "flex", alignItems: "center", gap: 10 },
                      children: [
                        !quota?.is_pro && /*#__PURE__*/_jsx("span", {
                          style: {
                            fontSize: 11,
                            fontWeight: 500,
                            fontVariantNumeric: "tabular-nums",
                            transition: "color 0.2s",
                            color: input.length > 1080
                              ? (input.length >= 1200 ? "hsl(343 85% 58%)" : "hsl(38 92% 50%)")
                              : "var(--muted-light)",
                          },
                          children: `${input.length}/1200`
                        }),
                        /*#__PURE__*/_jsx("button", {
                          type: isLoading ? "button" : "submit",
                          onClick: isLoading ? handleCancel : undefined,
                          disabled: !isLoading && !input.trim(),
                          style: {
                            width: 34,
                            height: 34,
                            borderRadius: 11,
                            border: "none",
                            cursor: (!isLoading && !input.trim()) ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "background 0.2s, box-shadow 0.2s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                            background: isLoading
                              ? "hsl(343 85% 56%)"
                              : input.trim()
                                ? "hsl(239 68% 58%)"
                                : "var(--surface)",
                            color: (isLoading || input.trim()) ? "#fff" : "var(--muted-light)",
                            boxShadow: (isLoading || input.trim())
                              ? "0 2px 8px hsl(239 68% 58% / 0.35)"
                              : "none",
                          },
                          onMouseEnter: e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = "scale(1.10)"; },
                          onMouseLeave: e => { e.currentTarget.style.transform = "scale(1)"; },
                          onMouseDown: e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = "scale(0.90)"; },
                          onMouseUp: e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = "scale(1.10)"; },
                          children: /*#__PURE__*/_jsx("span", {
                            className: "material-symbols-outlined icon-thin",
                            style: { fontSize: 17, transition: "transform 0.15s" },
                            children: isLoading ? "stop_circle" : "arrow_upward"
                          })
                        }),
                      ]
                    }),
                  ]
                }),
              ]
            }),
            quota && !quota.is_pro && quota.usage && quota.limits && /*#__PURE__*/_jsxs("div", {
              style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "0 4px" },
              children: [
                /*#__PURE__*/_jsx("div", {
                  style: { flex: 1, height: 2, background: "var(--border-subtle)", borderRadius: 99, overflow: "hidden" },
                  children: /*#__PURE__*/_jsx("div", {
                    style: {
                      height: "100%",
                      borderRadius: 99,
                      transition: "width 0.5s ease",
                      width: `${Math.min(quota.usage.chat_messages / quota.limits.chat_messages * 100, 100)}%`,
                      background: quota.usage.chat_messages / quota.limits.chat_messages > 0.8
                        ? "linear-gradient(90deg, hsl(38 92% 50%), hsl(343 85% 58%))"
                        : "linear-gradient(90deg, hsl(217 91% 60%), hsl(263 70% 62%))",
                    }
                  })
                }),
                /*#__PURE__*/_jsxs("span", {
                  style: { fontSize: 11, color: "var(--muted-light)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
                  children: [quota.limits.chat_messages - quota.usage.chat_messages, " l\u01B0\u1EE3t c\xF2n l\u1EA1i"]
                }),
              ]
            }),
            /*#__PURE__*/_jsx("p", {
              style: { fontSize: 11, color: "var(--muted-light)", fontWeight: 500, marginTop: 6, paddingLeft: 2 },
              children: CHAT_TEXTS.INPUT.DISCLAIMER
            }),
          ]
        })
      })]
    }), showModal && /*#__PURE__*/_jsx("div", {
      className: "fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-black/[0.08] dark:bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-150",
      onClick: () => {
        setShowModal(null);
        handleCancel();
      },
      children: /*#__PURE__*/_jsxs("div", {
        className: "bg-[var(--card-bg)] backdrop-blur-2xl w-full max-w-3xl max-h-[88dvh] rounded-2xl border border-[var(--border-color)] shadow-[0_12px_48px_hsl(222_47%_4%/0.18)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxs("div", {
          className: "px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0",
          children: [/*#__PURE__*/_jsxs("h3", {
            className: "text-[14px] font-semibold text-[var(--foreground)] tracking-[-0.01em] flex items-center gap-2.5",
            children: [/*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[16px] text-[var(--muted)]",
              children: showModal === "summary" ? "summarize" : showModal === "questions" ? "format_list_numbered" : "quiz"
            }), showModal === "summary" ? CHAT_TEXTS.MODALS.TITLES.SUMMARY : showModal === "questions" ? CHAT_TEXTS.MODALS.TITLES.QUESTIONS : CHAT_TEXTS.MODALS.TITLES.QUIZ]
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => {
              setShowModal(null);
              handleCancel();
            },
            className: "w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-all",
            children: /*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[18px]",
              children: "close"
            })
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex-1 overflow-y-auto px-6 py-6 custom-scrollbar",
          children: showModal === "summary" ? isSummaryLoading ? /*#__PURE__*/_jsx("div", {
            className: "space-y-3 animate-pulse",
            children: [100, 88, 95, 76, 91, 83].map((w, i) => /*#__PURE__*/_jsx("div", {
              className: "h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md",
              style: {
                width: `${w}%`
              }
            }, i))
          }) : /*#__PURE__*/_jsx("div", {
            className: "prose prose-sm dark:prose-invert max-w-none prose-p:leading-[1.8] prose-p:text-[13px] prose-p:text-[#374151] dark:prose-p:text-white/65 prose-headings:text-[#1F2937] dark:prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-strong:text-[#1F2937] dark:prose-strong:text-white prose-li:text-[13px] prose-li:text-[#374151] dark:prose-li:text-white/65",
            children: /*#__PURE__*/_jsx(ReactMarkdown, {
              remarkPlugins: [remarkGfm],
              children: String(summary || CHAT_TEXTS.MODALS.EMPTY.SUMMARY)
            })
          }) : showModal === "questions" ? isStudyQuestionsLoading ? /*#__PURE__*/_jsx("div", {
            className: "space-y-4 animate-pulse",
            children: [1, 2, 3, 4, 5].map(i => /*#__PURE__*/_jsxs("div", {
              className: "flex gap-3",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-white/[0.05] shrink-0 mt-0.5"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex-1 space-y-2",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-full"
                }), /*#__PURE__*/_jsx("div", {
                  className: "h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-2/3"
                })]
              })]
            }, i))
          }) : /*#__PURE__*/_jsx("div", {
            className: "space-y-1.5",
            children: studyQuestions ? studyQuestions.map((q, idx) => /*#__PURE__*/_jsxs("div", {
              className: "group flex gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] dark:hover:bg-white/[0.025] transition-all",
              children: [/*#__PURE__*/_jsx("span", {
                className: "w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-white/[0.06] text-[#6B7280] dark:text-white/35 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                children: idx + 1
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex-1",
                children: [/*#__PURE__*/_jsx("p", {
                  className: "text-[13px] text-[#374151] dark:text-white/70 font-medium leading-snug",
                  children: q
                }), /*#__PURE__*/_jsxs("button", {
                  onClick: () => {
                    setShowModal(null);
                    setInput(`Hãy giúp mình trả lời câu hỏi ôn tập: ${q}`);
                  },
                  className: "mt-1.5 text-[11px] text-[#9CA3AF] dark:text-white/25 hover:text-[#374151] dark:hover:text-white/60 font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "material-symbols-outlined text-[12px]",
                    children: "chat_bubble"
                  }), CHAT_TEXTS.MODALS.ASK_AI_TOOLTIP]
                })]
              })]
            }, idx)) : /*#__PURE__*/_jsx("p", {
              className: "text-[#9CA3AF] text-center py-10 text-[13px]",
              children: CHAT_TEXTS.MODALS.EMPTY.QUESTIONS
            })
          }) : isQuizLoading ? /*#__PURE__*/_jsx("div", {
            className: "space-y-5 animate-pulse",
            children: [1, 2].map(i => /*#__PURE__*/_jsxs("div", {
              className: "space-y-3 p-4 rounded-xl border border-[#F3F4F6] dark:border-white/[0.06]",
              children: [/*#__PURE__*/_jsx("div", {
                className: "h-3.5 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-full"
              }), [78, 72, 82, 68].map((w, j) => /*#__PURE__*/_jsx("div", {
                className: "h-8 bg-[#F3F4F6] dark:bg-white/[0.04] rounded-lg",
                style: {
                  width: `${w}%`
                }
              }, j))]
            }, i))
          }) : /*#__PURE__*/_jsx("div", {
            className: "space-y-4",
            children: quiz ? quiz.map((item, idx) => /*#__PURE__*/_jsxs("div", {
              className: "p-5 rounded-xl border border-[#E5E7EB] dark:border-white/[0.07] space-y-3",
              children: [/*#__PURE__*/_jsxs("p", {
                className: "text-[13px] font-semibold text-[#1F2937] dark:text-white leading-snug",
                children: [/*#__PURE__*/_jsxs("span", {
                  className: "text-[#9CA3AF] dark:text-white/25 font-medium mr-1",
                  children: [idx + 1, "."]
                }), item.question]
              }), /*#__PURE__*/_jsx("div", {
                className: "space-y-1.5",
                children: item.options.map((opt, optIdx) => /*#__PURE__*/_jsx("div", {
                  className: `px-4 py-2.5 rounded-lg text-[12.5px] font-medium border ${optIdx === item.correct_index ? "bg-emerald-50 dark:bg-emerald-500/[0.07] border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-[#FAFAFA] dark:bg-white/[0.02] border-[#F3F4F6] dark:border-white/[0.05] text-[#6B7280] dark:text-white/35"}`,
                  children: opt
                }, optIdx))
              }), /*#__PURE__*/_jsx("div", {
                className: "pt-2.5 border-t border-[#F9FAFB] dark:border-white/[0.04]",
                children: /*#__PURE__*/_jsx("p", {
                  className: "text-[12px] text-[#6B7280] dark:text-white/35 leading-relaxed",
                  children: item.explanation
                })
              })]
            }, idx)) : /*#__PURE__*/_jsx("p", {
              className: "text-[#9CA3AF] text-center py-10 text-[13px]",
              children: CHAT_TEXTS.MODALS.EMPTY.QUIZ
            })
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2 shrink-0",
          children: [/*#__PURE__*/_jsx("button", {
            onClick: () => setShowModal(null),
            className: "px-4 py-2 text-[12px] font-medium text-[#6B7280] dark:text-white/35 hover:text-[#1F2937] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.05] rounded-lg transition-all",
            children: CHAT_TEXTS.MODALS.BUTTONS.CLOSE
          }), showModal === "summary" && summary && /*#__PURE__*/_jsxs("button", {
            onClick: () => {
              const blob = new Blob([summary], {
                type: "text/plain"
              });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement("a");
              a.href = url;
              a.download = `Tom_tat_${docData?.file_name || "tai_lieu"}.txt`;
              a.click();
            },
            className: "px-4 py-2 text-[12px] font-medium bg-[#1F2937] dark:bg-white/90 text-white dark:text-[#0A0A0B] rounded-lg hover:opacity-80 transition-all flex items-center gap-1.5",
            children: [/*#__PURE__*/_jsx("span", {
              className: "material-symbols-outlined text-[14px]",
              children: "download"
            }), CHAT_TEXTS.MODALS.BUTTONS.DOWNLOAD_SUMMARY]
          })]
        })]
      })
    }), quotaExceeded && /*#__PURE__*/_jsx("div", {
      className: "fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/[0.12] dark:bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-150",
      onClick: () => setQuotaExceeded(null),
      children: /*#__PURE__*/_jsxs("div", {
        className: "bg-[var(--card-bg)] backdrop-blur-2xl w-full max-w-sm rounded-2xl border border-[var(--border-color)] shadow-[0_20px_60px_hsl(222_47%_4%/0.25)] p-8 text-center animate-in zoom-in-95 duration-200",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center mx-auto mb-5",
          children: /*#__PURE__*/_jsx("span", {
            className: "material-symbols-outlined text-[28px] text-amber-500",
            children: "bolt"
          })
        }), /*#__PURE__*/_jsx("h3", {
          className: "text-[16px] font-semibold text-[#1F2937] dark:text-white tracking-[-0.02em]",
          children: QUOTA_TEXTS.exceeded.title
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[13px] text-[#6B7280] dark:text-white/40 mt-2 leading-relaxed",
          children: quotaExceeded === "chat" ? QUOTA_TEXTS.exceeded.chat : QUOTA_TEXTS.exceeded.ai
        }), /*#__PURE__*/_jsx("p", {
          className: "text-[12px] text-[#9CA3AF] dark:text-white/25 mt-1",
          children: QUOTA_TEXTS.exceeded.desc
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex flex-col gap-2 mt-6",
          children: [/*#__PURE__*/_jsx("button", {
            onClick: () => {
              setQuotaExceeded(null);
              navigate("/settings");
            },
            className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-[hsl(239_68%_58%)] to-[hsl(263_70%_62%)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_16px_hsl(239_68%_58%/0.3)]",
            children: QUOTA_TEXTS.exceeded.upgradeBtn
          }), /*#__PURE__*/_jsx("button", {
            onClick: () => setQuotaExceeded(null),
            className: "w-full py-2.5 rounded-xl text-[13px] font-medium text-[#6B7280] dark:text-white/35 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.05] transition-all",
            children: QUOTA_TEXTS.exceeded.laterBtn
          })]
        })]
      })
    })]
  });
}