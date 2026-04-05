"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { 
  fetchDocument, 
  fetchChatSessions, 
  fetchSessionDetail, 
  askQuestion,
  fetchDocumentSummary,
  fetchDocumentQuiz,
  fetchDocumentMindmap,
  fetchDocumentStudyQuestions,
  deleteChatSession,
  DocumentResponse,
  ChatSessionResponse,
  MessageResponse,
  ChatSource
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
  
  // Summary & Quiz States
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [mindmap, setMindmap] = useState<string | null>(null);
  const [isMindmapLoading, setIsMindmapLoading] = useState(false);
  const [studyQuestions, setStudyQuestions] = useState<string[] | null>(null);
  const [isStudyQuestionsLoading, setIsStudyQuestionsLoading] = useState(false);
  const [showModal, setShowModal] = useState<"summary" | "quiz" | "mindmap" | "questions" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load document and sessions
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const doc = await fetchDocument(documentId);
        setDocData(doc);
        
        const docSessions = await fetchChatSessions(documentId);
        setSessions(docSessions);
        
        if (docSessions.length > 0) {
          loadSession(docSessions[0].id);
        }

        // Auto trigger action if specified in URL
        if (initialAction === "quiz") {
          handleGetQuiz();
        } else if (initialAction === "summary") {
          handleGetSummary();
        } else if (initialAction === "mindmap") {
          handleGetMindmap();
        } else if (initialAction === "questions") {
          handleGetStudyQuestions();
        }
      } catch (error) {
        console.error("Error loading chat data:", error);
      }
    };
    loadInitialData();
  }, [documentId]);

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
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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

      setMessages((prev) => [...prev, response.message]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Request cancelled by user");
        return;
      }
      console.error("Error sending message:", error);
      const errorMessage: MessageResponse = {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: error.message || "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      // Remove the last message from the user if you want, but normally just stopping LLM is enough
      // Or add a "Cancelled" notice
      const cancelNotice: MessageResponse = {
        id: Date.now().toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: "_Đã hủy yêu cầu._",
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, cancelNotice]);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiên thảo luận này không?")) return;
    
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Không thể xóa phiên thảo luận.");
    }
  };

  const handleGetSummary = async () => {
    setIsSummaryLoading(true);
    setShowModal("summary");
    try {
      const result = await fetchDocumentSummary(documentId);
      setSummary(result);
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleGetQuiz = async () => {
    setIsQuizLoading(true);
    setShowModal("quiz");
    try {
      const result = await fetchDocumentQuiz(documentId);
      setQuiz(result);
    } catch (error: any) {
      console.error("Error fetching quiz:", error);
      // We can use a more specific error state here if needed
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleGetMindmap = async () => {
    setIsMindmapLoading(true);
    setShowModal("mindmap");
    try {
      const result = await fetchDocumentMindmap(documentId);
      setMindmap(result);
      
      // Dynamically load mermaid and render
      if (typeof window !== 'undefined') {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
        setTimeout(() => {
          mermaid.contentLoaded();
        }, 100);
      }
    } catch (error) {
      console.error("Error fetching mindmap:", error);
    } finally {
      setIsMindmapLoading(false);
    }
  };

  const handleGetStudyQuestions = async () => {
    setIsStudyQuestionsLoading(true);
    setShowModal("questions");
    try {
      const result = await fetchDocumentStudyQuestions(documentId);
      setStudyQuestions(result);
    } catch (error) {
      console.error("Error fetching study questions:", error);
    } finally {
      setIsStudyQuestionsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-[#F8FAFC] overflow-hidden selection:bg-blue-100">
      {/* Sessions Sidebar - Independent Scroll */}
      {isSidebarOpen && (
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col h-full shrink-0 z-30 shadow-xl shadow-slate-200/50">
          <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-white">
            <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">history</span>
              {CHAT_TEXTS.SIDEBAR.TITLE}
            </h2>
            <button 
              onClick={startNewChat}
              className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-blue-600 rounded-lg transition-all active:scale-95 border border-blue-100"
              title={CHAT_TEXTS.SIDEBAR.NEW_CHAT_TOOLTIP}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
            {sessions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-slate-400">{CHAT_TEXTS.SIDEBAR.NO_SESSIONS}</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="relative group">
                  <button
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border group-hover:border-slate-200 ${
                      currentSessionId === session.id 
                        ? "bg-white border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-50" 
                        : "border-transparent hover:bg-white text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 pr-6">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        currentSessionId === session.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] truncate">{session.title}</p>
                        <p className="text-[10px] opacity-50 mt-0.5 uppercase tracking-tighter">
                          {new Date(session.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(session.updated_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100"
                    title="Xóa phiên chat"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

       {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Header - Fixed height, No Scroll */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center gap-6 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isSidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 shrink-0">picture_as_pdf</span>
                <span className={`text-[17px] font-bold text-slate-800 truncate transition-all duration-300 ${
                  isSidebarOpen ? "max-w-[200px] sm:max-w-[300px]" : "max-w-[250px] sm:max-w-[600px]"
                }`} title={docData?.file_name}>
                  {docData?.file_name || CHAT_TEXTS.HEADER.LOADING_DOC}
                </span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleGetSummary}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all text-[13px] font-bold border border-purple-100"
            >
              <span className="material-symbols-outlined text-[18px]">summarize</span>
              {CHAT_TEXTS.HEADER.ACTIONS.SUMMARY}
            </button>
            <button 
              onClick={handleGetQuiz}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all text-[13px] font-bold border border-orange-100"
            >
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              {CHAT_TEXTS.HEADER.ACTIONS.QUIZ}
            </button>
            <button 
              onClick={handleGetMindmap}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-[13px] font-bold border border-blue-100"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              {CHAT_TEXTS.HEADER.ACTIONS.MINDMAP}
            </button>
          </div>
        </header>

        {/* Message Container - Independent Scroll */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar bg-slate-50/30 relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto py-10">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-200">
                  <span className="material-symbols-outlined text-[48px] drop-shadow-lg">smart_toy</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-[18px] animate-pulse">chat</span>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{CHAT_TEXTS.WELCOME.TITLE}</h2>
                <p className="text-slate-500 text-md leading-relaxed px-4">
                  {CHAT_TEXTS.WELCOME.SUBTITLE}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4">
                {CHAT_TEXTS.WELCOME.SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="p-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:text-blue-600 transition-all text-left shadow-sm hover:shadow-md"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-10 pb-10">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-6 animate-in slide-in-from-bottom-4 duration-500 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-11 h-11 rounded-[16px] shrink-0 flex items-center justify-center shadow-md ${
                    msg.role === "user" 
                    ? "bg-slate-900 text-white shadow-slate-200" 
                    : "bg-white border border-blue-100 text-blue-600 shadow-blue-50"
                  }`}>
                    <span className="material-symbols-outlined text-[22px]">
                      {msg.role === "user" ? "person" : "auto_awesome"}
                    </span>
                  </div>
                  <div className={`flex-1 space-y-3 pt-1 ${msg.role === "user" ? "text-right flex flex-col items-end" : ""}`}>
                    <div className={`max-w-[90%] prose prose-slate text-slate-700 leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white p-5 rounded-3xl rounded-tr-none shadow-lg shadow-blue-100 prose-p:text-white prose-strong:text-white" 
                        : "bg-white p-7 rounded-3xl rounded-tl-none border border-[#E2E8F0] shadow-sm shadow-slate-100"
                    }`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className={`mt-4 flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.sources.map((source, idx) => (
                          <div 
                            key={idx}
                            className="group relative px-4 py-2 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-xl transition-all border border-blue-100/50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px]">menu_book</span>
                              {CHAT_TEXTS.MESSAGES.SOURCE_PAGE} {source.page_number}
                            </span>
                            <div className="origin-bottom absolute bottom-full left-0 mb-3 w-80 bg-white p-4 rounded-2xl shadow-2xl border border-blue-100 pointer-events-none opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all z-50">
                               <div className="font-bold text-blue-600 text-[10px] uppercase mb-2 border-b border-blue-50 pb-1">{CHAT_TEXTS.MESSAGES.EXTRACT_FROM} {source.page_number}</div>
                               <p className="italic text-slate-600 text-[12px] leading-relaxed">"{source.text_excerpt}..."</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-6 py-4">
                  <div className="w-11 h-11 rounded-[16px] bg-white border border-blue-100 text-blue-600 shadow-blue-50 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-4">
                      <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">{CHAT_TEXTS.MESSAGES.AI_ANALYZING}</p>
                    </div>
                    <div className="flex gap-1.5 items-center bg-slate-100 px-4 py-2 rounded-full w-fit">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-jumping-dot"></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-jumping-dot delay-200"></span>
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-jumping-dot delay-400"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSendMessage}
              className="relative group flex items-center"
            >
              <div className="absolute left-6 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={CHAT_TEXTS.INPUT.PLACEHOLDER}
                className="w-full bg-slate-50 text-slate-900 py-4 pl-16 pr-24 rounded-[32px] focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all border border-slate-100 focus:border-blue-300 text-[16px] font-medium shadow-inner"
                disabled={isLoading}
              />
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? handleCancel : undefined}
                disabled={!input.trim() && !isLoading}
                className={`absolute right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  (input.trim() || isLoading)
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isLoading ? "stop_circle" : "send"}
                </span>
              </button>
            </form>
            <div className="flex justify-center items-center px-4 mt-4">
              <p className="text-[11px] text-slate-300">
                {CHAT_TEXTS.INPUT.DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Summary/Quiz Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <span className={`material-symbols-outlined ${
                  showModal === 'summary' ? 'text-purple-600' : 
                  showModal === 'mindmap' ? 'text-blue-600' : 
                  showModal === 'questions' ? 'text-emerald-600' : 'text-orange-600'
                }`}>
                  {showModal === 'summary' ? 'summarize' : 
                   showModal === 'mindmap' ? 'account_tree' : 
                   showModal === 'questions' ? 'format_list_numbered' : 'quiz'}
                </span>
                {showModal === 'summary' ? CHAT_TEXTS.MODALS.TITLES.SUMMARY : 
                 showModal === 'mindmap' ? CHAT_TEXTS.MODALS.TITLES.MINDMAP : 
                 showModal === 'questions' ? CHAT_TEXTS.MODALS.TITLES.QUESTIONS : CHAT_TEXTS.MODALS.TITLES.QUIZ}
              </h3>
              <button 
                onClick={() => setShowModal(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {showModal === 'summary' ? (
                isSummaryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">{CHAT_TEXTS.MODALS.LOADING.SUMMARY}</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-li:my-1">
                    <ReactMarkdown>{summary || CHAT_TEXTS.MODALS.EMPTY.SUMMARY}</ReactMarkdown>
                  </div>
                )
              ) : showModal === 'mindmap' ? (
                isMindmapLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">{CHAT_TEXTS.MODALS.LOADING.MINDMAP}</p>
                  </div>
                ) : (
                  <div className="flex justify-center bg-white p-4 rounded-xl overflow-x-auto min-h-[400px]">
                    <div className="mermaid text-center">
                      {mindmap || CHAT_TEXTS.MODALS.EMPTY.MINDMAP}
                    </div>
                  </div>
                )
              ) : showModal === 'questions' ? (
                isStudyQuestionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">{CHAT_TEXTS.MODALS.LOADING.QUESTIONS}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-600 mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-sm">
                      {CHAT_TEXTS.MODALS.QUESTIONS_HINT}
                    </p>
                    {studyQuestions ? studyQuestions.map((q, idx) => (
                      <div 
                        key={idx} 
                        className="group flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-700 font-medium leading-relaxed">{q}</p>
                          <button 
                            onClick={() => {
                              setShowModal(null);
                              setInput(`Hãy giúp mình trả lời câu hỏi ôn tập: ${q}`);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            {CHAT_TEXTS.MODALS.ASK_AI_TOOLTIP}
                          </button>
                        </div>
                      </div>
                    )) : <p>{CHAT_TEXTS.MODALS.EMPTY.QUESTIONS}</p>}
                  </div>
                )
              ) : (
                isQuizLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">{CHAT_TEXTS.MODALS.LOADING.QUIZ}</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {quiz ? quiz.map((item, idx) => (
                      <div key={idx} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="font-bold text-lg text-slate-800 flex items-start gap-2">
                          <span className="text-orange-600 whitespace-nowrap shrink-0">Câu {idx + 1}:</span>
                          <span>{item.question}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {item.options.map((opt: string, optIdx: number) => (
                            <div 
                              key={optIdx}
                              className={`p-4 rounded-xl border text-sm transition-all ${
                                optIdx === item.correct_index 
                                  ? "bg-green-50 border-green-200 text-green-700 font-medium" 
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                           <p className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                             <span className="material-symbols-outlined text-[16px]">info</span>
                             Giải thích
                           </p>
                           <p className="text-sm text-slate-600 leading-relaxed">{item.explanation}</p>
                        </div>
                      </div>
                    )) : <p>{CHAT_TEXTS.MODALS.EMPTY.QUIZ}</p>}
                  </div>
                )
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(null)}
                className="px-6 py-2.5 font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
              >
                {CHAT_TEXTS.MODALS.BUTTONS.CLOSE}
              </button>
              {showModal === 'summary' && summary && (
                <button 
                  onClick={() => {
                    const blob = new Blob([summary], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement("a");
                    a.href = url;
                    a.download = `Tom_tat_${docData?.file_name || 'tai_lieu'}.txt`;
                    a.click();
                  }}
                  className="px-6 py-2.5 font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  {CHAT_TEXTS.MODALS.BUTTONS.DOWNLOAD_SUMMARY}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
