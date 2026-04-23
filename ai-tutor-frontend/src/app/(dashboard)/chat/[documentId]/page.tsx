"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import MermaidChart from "@/components/MermaidChart";

import {
  fetchDocument,
  fetchChatSessions,
  fetchSessionDetail,
  askQuestion,
  fetchDocumentSummaryStream,
  fetchDocumentQuizStream,
  fetchDocumentMindmapStream,
  fetchDocumentStudyQuestionsStream,
  fetchDocumentSummary,
  fetchDocumentQuiz,
  fetchDocumentStudyQuestions,
  deleteChatSession,
  DocumentResponse,
  ChatSessionResponse,
  MessageResponse,
} from "@/services/api.service";
import { CHAT_TEXTS } from "@/constants/texts";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = params.documentId as string;
  const initialAction = searchParams.get("action");

  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [studyQuestions, setStudyQuestions] = useState<string[] | null>(null);
  const [isStudyQuestionsLoading, setIsStudyQuestionsLoading] = useState(false);
  const [showModal, setShowModal] = useState<"summary" | "quiz" | "mindmap" | "questions" | null>(null);
  const [chatUsed, setChatUsed] = useState<number | null>(null);
  const [chatLimit, setChatLimit] = useState<number>(30);
  const [isProUser, setIsProUser] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const doc = await fetchDocument(documentId);
        setDocData(doc);
        const docSessions = await fetchChatSessions(documentId);
        setSessions(docSessions);
        if (docSessions.length > 0) loadSession(docSessions[0].id);
        if (initialAction === "quiz") handleGetQuiz();
        else if (initialAction === "summary") handleGetSummary();
        else if (initialAction === "questions") handleGetStudyQuestions();
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

  // Load quota info once on mount
  useEffect(() => {
    import("@/services/api.service").then(({ authFetch }) => {
      authFetch("/api/v1/quota/me")
        .then(r => r.json())
        .then(data => {
          setIsProUser(data.is_pro);
          if (!data.is_pro && data.usage) {
            setChatUsed(data.usage.chat_messages);
            setChatLimit(data.limits?.chat_messages ?? 30);
          }
        })
        .catch(() => {});
    });
  }, []);

  const loadSession = async (sessionId: string) => {
    try {
      const detail = await fetchSessionDetail(sessionId);
      setMessages(detail.messages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage: MessageResponse = {
      id: Date.now().toString(),
      session_id: currentSessionId || "",
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await askQuestion(documentId, { question: input, session_id: currentSessionId || undefined }, controller.signal);
      if (!currentSessionId) {
        setCurrentSessionId(response.session_id);
        const updatedSessions = await fetchChatSessions(documentId);
        setSessions(updatedSessions);
      }
      // Update quota counter optimistically
      setChatUsed(prev => prev !== null ? prev + 1 : null);
      const fullContent = response.message.content;
      const assistantId = response.message.id;
      setMessages((prev) => [...prev, { ...response.message, content: "" }]);
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < fullContent.length) {
          const nextChar = fullContent[currentIdx];
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantId) {
              return [...prev.slice(0, -1), { ...last, content: last.content + nextChar }];
            }
            return prev;
          });
          currentIdx++;
          scrollToBottom();
        } else {
          stopTypewriter();
        }
      }, 10);
      typewriterIntervalRef.current = interval;
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: error.message || "Đã xảy ra lỗi không xác định.",
        created_at: new Date().toISOString(),
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
    setIsLoading(false);
    abortControllerRef.current = null;
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
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: "_Đã hủy yêu cầu._",
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const startNewChat = () => { setCurrentSessionId(null); setMessages([]); };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Xóa phiên thảo luận này?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) startNewChat();
    } catch (error) { console.error(error); }
  };

  const handleGetSummary = async () => {
    setIsSummaryLoading(true); setShowModal("summary"); setSummary("");
    const controller = new AbortController(); abortControllerRef.current = controller;
    try {
      await fetchDocumentSummaryStream(documentId, (chunk) => { setIsSummaryLoading(false); setSummary((prev) => (prev || "") + chunk); }, controller.signal);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setSummary((prev) => (prev || "") + "\n\n_Dừng tóm tắt._");
    } finally { setIsSummaryLoading(false); abortControllerRef.current = null; }
  };

  const handleGetQuiz = async () => {
    setIsQuizLoading(true); setShowModal("quiz"); setQuiz([]);
    const controller = new AbortController(); abortControllerRef.current = controller;
    let accumulated = "";
    try {
      await fetchDocumentQuizStream(documentId, (chunk) => { accumulated += chunk; }, false, controller.signal);
      try {
        let jsonStr = accumulated.trim();
        if (jsonStr.includes("```json")) jsonStr = jsonStr.split("```json")[1].split("```")[0];
        else if (jsonStr.includes("```")) jsonStr = jsonStr.split("```")[1].split("```")[0];
        const parsed = JSON.parse(jsonStr.trim());
        setQuiz(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        const data = await fetchDocumentQuiz(documentId, controller.signal);
        setQuiz(data);
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
    } finally { setIsQuizLoading(false); abortControllerRef.current = null; }
  };

  const handleGetStudyQuestions = async () => {
    setIsStudyQuestionsLoading(true); setShowModal("questions"); setStudyQuestions([]);
    const controller = new AbortController(); abortControllerRef.current = controller;
    let accumulated = "";
    try {
      await fetchDocumentStudyQuestionsStream(documentId, (chunk) => {
        setIsStudyQuestionsLoading(false);
        accumulated += chunk;
        const lines = accumulated.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter((l) => l.length > 5);
        setStudyQuestions(lines);
      }, controller.signal);
    } catch (error: any) {
      if (error.name === "AbortError") return;
    } finally { setIsStudyQuestionsLoading(false); abortControllerRef.current = null; }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden font-sans bg-white dark:bg-[#0A0A0B]">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`shrink-0 flex flex-col h-full z-30 border-r border-[#F3F4F6] dark:border-white/[0.06] bg-[#FAFAFA] dark:bg-[#111113] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${isSidebarOpen ? "w-60" : "w-0 border-0"}`}
      >
        <div className="px-4 py-3.5 border-b border-[#F3F4F6] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-[#9CA3AF] dark:text-white/25 uppercase tracking-[0.08em]">
            {sessions.length} cuộc hội thoại
          </span>
          <button onClick={startNewChat} title={CHAT_TEXTS.SIDEBAR.NEW_CHAT_TOOLTIP}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-white/5 hover:text-[#374151] dark:hover:text-white transition-all">
            <span className="material-symbols-outlined text-[17px]">edit_square</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-[12px] text-[#9CA3AF] dark:text-white/20 font-medium">{CHAT_TEXTS.SIDEBAR.NO_SESSIONS}</p>
            </div>
          ) : sessions.map((session) => (
            <div key={session.id} className="relative group">
              <button onClick={() => loadSession(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  currentSessionId === session.id
                    ? "bg-white dark:bg-white/[0.06] text-[#1F2937] dark:text-white shadow-sm border border-[#E5E7EB] dark:border-white/[0.08]"
                    : "text-[#6B7280] dark:text-white/35 hover:bg-white dark:hover:bg-white/[0.03] hover:text-[#374151] dark:hover:text-white/70"
                }`}>
                <p className="text-[12.5px] font-medium truncate pr-5 leading-snug">{session.title || "Cuộc trò chuyện mới"}</p>
                <p className="text-[10.5px] text-[#9CA3AF] dark:text-white/20 mt-0.5">
                  {new Date(session.updated_at).toLocaleDateString("vi-VN")}
                </p>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[#9CA3AF] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <span className="material-symbols-outlined text-[13px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-[#0A0A0B]">

        {/* Header */}
        <header className="h-14 border-b border-[#F3F4F6] dark:border-white/[0.06] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] dark:text-white/25 hover:bg-[#F3F4F6] dark:hover:bg-white/5 hover:text-[#374151] dark:hover:text-white transition-all">
              <span className="material-symbols-outlined text-[20px]">{isSidebarOpen ? "menu_open" : "menu"}</span>
            </button>
            <div className="min-w-0">
              <h1
                className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white/90 truncate tracking-[-0.02em] max-w-[220px] md:max-w-sm"
                style={{ fontFamily: "var(--font-serif)" }}
                title={docData?.file_name}
              >
                {docData?.file_name || CHAT_TEXTS.HEADER.LOADING_DOC}
              </h1>
              {docData && (
                <p className="text-[11px] text-[#9CA3AF] dark:text-white/25">
                  {docData.file_size_mb?.toFixed?.(1) ?? "—"} MB · {docData.page_count} trang
                </p>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[
              { onClick: handleGetSummary, icon: "summarize", label: CHAT_TEXTS.HEADER.ACTIONS.SUMMARY },
              { onClick: () => router.push(`/quiz/${documentId}`), icon: "quiz", label: CHAT_TEXTS.HEADER.ACTIONS.QUIZ },
              { onClick: () => router.push(`/mindmap/${documentId}`), icon: "hub", label: CHAT_TEXTS.HEADER.ACTIONS.MINDMAP },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} title={btn.label}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium text-[#6B7280] dark:text-white/35 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.05] hover:text-[#1F2937] dark:hover:text-white transition-all">
                <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                <span className="hidden md:inline">{btn.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto px-6 md:px-4 py-10">

          {messages.length === 0 ? (
            /* Welcome */
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500 pt-12">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.05] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-[#9CA3AF] dark:text-white/30">auto_stories</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-[20px] font-semibold text-[#1F2937] dark:text-white tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-serif)" }}>
                  {CHAT_TEXTS.WELCOME.TITLE}
                </h2>
                <p className="text-[13px] text-[#6B7280] dark:text-white/35 leading-relaxed max-w-sm">
                  {CHAT_TEXTS.WELCOME.SUBTITLE}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {CHAT_TEXTS.WELCOME.SUGGESTIONS.map((q) => (
                  <button key={q} onClick={() => setInput(q)}
                    className="p-3 text-left text-[12px] text-[#374151] dark:text-white/55 bg-[#F9FAFB] dark:bg-white/[0.03] border border-[#E5E7EB] dark:border-white/[0.07] rounded-xl hover:border-[#9CA3AF] dark:hover:border-white/20 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 font-medium leading-snug">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {messages.map((msg) => (
                <div key={msg.id}
                  className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === "user"
                      ? "bg-[#1F2937] dark:bg-white/90"
                      : "bg-[#F3F4F6] dark:bg-white/[0.06]"
                  }`}>
                    <span className={`material-symbols-outlined text-[16px] ${
                      msg.role === "user" ? "text-white dark:text-[#1F2937]" : "text-[#6B7280] dark:text-white/35"
                    }`}>
                      {msg.role === "user" ? "person" : "auto_awesome"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>
                    {msg.role === "assistant" && (
                      <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-white/20 mb-1.5 uppercase tracking-[0.08em]">
                        AI Trợ lý
                      </p>
                    )}
                    <div className={`text-[13.5px] leading-[1.75] ${
                      msg.role === "user"
                        ? "inline-block bg-[#1F2937] dark:bg-white/90 text-white dark:text-[#111113] px-4 py-2.5 rounded-2xl rounded-tr-sm font-medium max-w-[85%]"
                        : "text-[#374151] dark:text-white/75 w-full"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-p:leading-[1.75] prose-p:text-[13.5px] prose-p:text-[#374151] dark:prose-p:text-white/70 prose-p:m-0 prose-p:mb-3 last:prose-p:mb-0
                          prose-headings:text-[#1F2937] dark:prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-headings:mt-5 prose-headings:mb-2
                          prose-strong:text-[#1F2937] dark:prose-strong:text-white prose-strong:font-semibold
                          prose-code:text-[11.5px] prose-code:bg-[#F3F4F6] dark:prose-code:bg-white/[0.07] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[#374151] dark:prose-code:text-white/65 prose-code:before:content-none prose-code:after:content-none
                          prose-pre:bg-[#F9FAFB] dark:prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-[#E5E7EB] dark:prose-pre:border-white/[0.07] prose-pre:rounded-xl
                          prose-blockquote:border-l-2 prose-blockquote:border-[#D1D5DB] dark:prose-blockquote:border-white/15 prose-blockquote:pl-4 prose-blockquote:text-[#6B7280] dark:prose-blockquote:text-white/35 prose-blockquote:not-italic
                          prose-li:text-[13.5px] prose-li:text-[#374151] dark:prose-li:text-white/65 prose-li:leading-[1.7]
                          prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                          prose-table:text-[12px] prose-th:font-semibold prose-th:text-[#1F2937] dark:prose-th:text-white prose-td:text-[#374151] dark:prose-td:text-white/65 prose-table:border-collapse prose-th:border prose-th:border-[#E5E7EB] dark:prose-th:border-white/[0.08] prose-td:border prose-td:border-[#F3F4F6] dark:prose-td:border-white/[0.05] prose-th:px-3 prose-td:px-3">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {/* Blinking cursor while streaming */}
                          {isLoading && msg.id === messages[messages.length - 1]?.id && (
                            <span className="inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle opacity-75 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading dots */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-4 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.06] flex items-center justify-center mt-0.5 shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] dark:text-white/30">auto_awesome</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-[12px] font-medium text-[#9CA3AF] dark:text-white/25 mb-2.5">{CHAT_TEXTS.MESSAGES.AI_ANALYZING}</p>
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-2 h-2 bg-[#D1D5DB] dark:bg-white/20 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
          </div>
        </div>

        {/* Input bar */}
        <div className="px-5 md:px-10 py-4 border-t border-[#F3F4F6] dark:border-white/[0.06] shrink-0">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 group">

              {/* Textarea wrapper — clips native scrollbar */}
              <div className="flex-1 flex items-center rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-white/[0.02] overflow-hidden transition-all focus-within:border-[#9CA3AF] dark:focus-within:border-white/20 focus-within:bg-white dark:focus-within:bg-white/[0.04]">
                {/* Icon — flex item, self-center */}
                <span className="material-symbols-outlined text-[18px] shrink-0 ml-4 text-[#D1D5DB] dark:text-white/15 group-focus-within:text-[#9CA3AF] dark:group-focus-within:text-white/30 transition-colors self-center pointer-events-none" style={{ lineHeight: 1 }}>
                  psychology
                </span>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading) handleSendMessage();
                    }
                  }}
                  rows={1}
                  maxLength={600}
                  placeholder={CHAT_TEXTS.INPUT.PLACEHOLDER}
                  className="flex-1 bg-transparent text-[#1F2937] dark:text-white/85 py-3.5 pl-3 pr-4 focus:outline-none text-[13px] font-medium placeholder:text-[#D1D5DB] dark:placeholder:text-white/15 resize-none overflow-y-auto leading-relaxed"
                  style={{ minHeight: "52px", maxHeight: "120px" }}
                />
              </div>

              {/* Send / Stop */}
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? handleCancel : undefined}
                disabled={!isLoading && !input.trim()}
                className={`shrink-0 mb-1 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isLoading
                    ? "bg-red-500/90 dark:bg-red-500/80 text-white hover:opacity-80 active:scale-95"
                    : input.trim()
                      ? "bg-[#1F2937] dark:bg-white/90 text-white dark:text-[#0A0A0B] hover:opacity-75 active:scale-95"
                      : "bg-[#F3F4F6] dark:bg-white/[0.04] text-[#D1D5DB] dark:text-white/15 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[18px] transition-transform">
                  {isLoading ? "stop_circle" : "arrow_upward"}
                </span>
              </button>
            </form>

            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="text-[11px] text-[#9CA3AF] dark:text-white/20 font-medium">{CHAT_TEXTS.INPUT.DISCLAIMER}</p>
              <span className={`text-[11px] font-medium tabular-nums transition-colors ${
                input.length > 540
                  ? input.length >= 600 ? "text-red-400" : "text-amber-400"
                  : "text-[#D1D5DB] dark:text-white/15"
              }`}>
                {input.length}/600
              </span>
            </div>

            {/* Quota progress bar — only for free users */}
            {!isProUser && chatUsed !== null && (
              <div className="flex items-center gap-2 mt-2 px-0.5">
                <div className="flex-1 h-0.5 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      chatUsed / chatLimit > 0.8
                        ? "bg-gradient-to-r from-amber-400 to-red-400"
                        : "bg-gradient-to-r from-blue-400 to-violet-400"
                    }`}
                    style={{ width: `${Math.min((chatUsed / chatLimit) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium tabular-nums shrink-0 ${
                  chatUsed / chatLimit > 0.8 ? "text-amber-400" : "text-[#9CA3AF] dark:text-white/20"
                }`}>
                  {chatLimit - chatUsed} lượt còn lại
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-black/[0.08] dark:bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-150"
          onClick={() => { setShowModal(null); handleCancel(); }}
        >
          <div
            className="bg-white dark:bg-[#111113] w-full max-w-3xl max-h-[88vh] rounded-2xl border border-[#E5E7EB] dark:border-white/[0.07] shadow-[0_12px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#F3F4F6] dark:border-white/[0.06] flex items-center justify-between shrink-0">
              <h3 className="text-[14px] font-semibold text-[#1F2937] dark:text-white tracking-[-0.01em] flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] dark:text-white/30">
                  {showModal === "summary" ? "summarize" : showModal === "questions" ? "format_list_numbered" : "quiz"}
                </span>
                {showModal === "summary" ? CHAT_TEXTS.MODALS.TITLES.SUMMARY :
                  showModal === "questions" ? CHAT_TEXTS.MODALS.TITLES.QUESTIONS : CHAT_TEXTS.MODALS.TITLES.QUIZ}
              </h3>
              <button
                onClick={() => { setShowModal(null); handleCancel(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-white/5 hover:text-[#374151] dark:hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              {showModal === "summary" ? (
                isSummaryLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[100, 88, 95, 76, 91, 83].map((w, i) => (
                      <div key={i} className="h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-p:leading-[1.8] prose-p:text-[13px] prose-p:text-[#374151] dark:prose-p:text-white/65
                    prose-headings:text-[#1F2937] dark:prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-[-0.01em]
                    prose-strong:text-[#1F2937] dark:prose-strong:text-white
                    prose-li:text-[13px] prose-li:text-[#374151] dark:prose-li:text-white/65">
                    <ReactMarkdown>{String(summary || CHAT_TEXTS.MODALS.EMPTY.SUMMARY)}</ReactMarkdown>
                  </div>
                )
              ) : showModal === "questions" ? (
                isStudyQuestionsLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-white/[0.05] shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-full" />
                          <div className="h-3 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {studyQuestions ? studyQuestions.map((q, idx) => (
                      <div key={idx} className="group flex gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] dark:hover:bg-white/[0.025] transition-all">
                        <span className="w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-white/[0.06] text-[#6B7280] dark:text-white/35 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                        <div className="flex-1">
                          <p className="text-[13px] text-[#374151] dark:text-white/70 font-medium leading-snug">{q}</p>
                          <button
                            onClick={() => { setShowModal(null); setInput(`Hãy giúp mình trả lời câu hỏi ôn tập: ${q}`); }}
                            className="mt-1.5 text-[11px] text-[#9CA3AF] dark:text-white/25 hover:text-[#374151] dark:hover:text-white/60 font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">chat_bubble</span>
                            {CHAT_TEXTS.MODALS.ASK_AI_TOOLTIP}
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-[#9CA3AF] text-center py-10 text-[13px]">{CHAT_TEXTS.MODALS.EMPTY.QUESTIONS}</p>}
                  </div>
                )
              ) : (
                isQuizLoading ? (
                  <div className="space-y-5 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="space-y-3 p-4 rounded-xl border border-[#F3F4F6] dark:border-white/[0.06]">
                        <div className="h-3.5 bg-[#F3F4F6] dark:bg-white/[0.05] rounded-md w-full" />
                        {[78, 72, 82, 68].map((w, j) => (
                          <div key={j} className="h-8 bg-[#F3F4F6] dark:bg-white/[0.04] rounded-lg" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quiz ? quiz.map((item, idx) => (
                      <div key={idx} className="p-5 rounded-xl border border-[#E5E7EB] dark:border-white/[0.07] space-y-3">
                        <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white leading-snug">
                          <span className="text-[#9CA3AF] dark:text-white/25 font-medium mr-1">{idx + 1}.</span>
                          {item.question}
                        </p>
                        <div className="space-y-1.5">
                          {item.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className={`px-4 py-2.5 rounded-lg text-[12.5px] font-medium border ${
                              optIdx === item.correct_index
                                ? "bg-emerald-50 dark:bg-emerald-500/[0.07] border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-[#FAFAFA] dark:bg-white/[0.02] border-[#F3F4F6] dark:border-white/[0.05] text-[#6B7280] dark:text-white/35"
                            }`}>
                              {opt}
                            </div>
                          ))}
                        </div>
                        <div className="pt-2.5 border-t border-[#F9FAFB] dark:border-white/[0.04]">
                          <p className="text-[12px] text-[#6B7280] dark:text-white/35 leading-relaxed">{item.explanation}</p>
                        </div>
                      </div>
                    )) : <p className="text-[#9CA3AF] text-center py-10 text-[13px]">{CHAT_TEXTS.MODALS.EMPTY.QUIZ}</p>}
                  </div>
                )
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#F9FAFB] dark:border-white/[0.05] flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowModal(null)}
                className="px-4 py-2 text-[12px] font-medium text-[#6B7280] dark:text-white/35 hover:text-[#1F2937] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.05] rounded-lg transition-all"
              >
                {CHAT_TEXTS.MODALS.BUTTONS.CLOSE}
              </button>
              {showModal === "summary" && summary && (
                <button
                  onClick={() => {
                    const blob = new Blob([summary], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement("a");
                    a.href = url;
                    a.download = `Tom_tat_${docData?.file_name || "tai_lieu"}.txt`;
                    a.click();
                  }}
                  className="px-4 py-2 text-[12px] font-medium bg-[#1F2937] dark:bg-white/90 text-white dark:text-[#0A0A0B] rounded-lg hover:opacity-80 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  {CHAT_TEXTS.MODALS.BUTTONS.DOWNLOAD_SUMMARY}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
