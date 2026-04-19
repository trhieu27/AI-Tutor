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
  
  // Summary & Quiz States
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [mindmap] = useState<string | null>(null);
  const [isMindmapLoading] = useState(false);
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

        if (initialAction === "quiz") {
          handleGetQuiz();
        } else if (initialAction === "summary") {
          handleGetSummary();
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

      // Typewriter Effect logic
      const fullContent = response.message.content;
      const assistantId = response.message.id;
      
      const newAssistantMessage: MessageResponse = {
        ...response.message,
        content: ""
      };
      
      setMessages((prev) => [...prev, newAssistantMessage]);
      
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < fullContent.length) {
          const nextChar = fullContent[currentIdx];
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last.id === assistantId) {
              return [...prev.slice(0, -1), { ...last, content: last.content + nextChar }];
            }
            return prev;
          });
          currentIdx++;
          // Scroll while typing
          scrollToBottom();
        } else {
          clearInterval(interval);
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }, 10); // Adjust typing speed here (ms per char)

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const errorMessage: MessageResponse = {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || "",
        role: "assistant",
        content: error.message || "Đã xảy ra lỗi không xác định.",
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setMessages((prev) => [...prev, {
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
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Xóa phiên thảo luận này?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) startNewChat();
    } catch (error) {
      console.error(error);
    }
  };

  const handleGetSummary = async () => {
    setIsSummaryLoading(true);
    setShowModal("summary");
    try {
      const result = await fetchDocumentSummary(documentId);
      setSummary(result);
    } catch (error) {
      console.error(error);
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
      console.error(error);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleGetStudyQuestions = async () => {
    setIsStudyQuestionsLoading(true);
    setShowModal("questions");
    try {
      const result = await fetchDocumentStudyQuestions(documentId);
      setStudyQuestions(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsStudyQuestionsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden relative selection:bg-indigo-500/30">
      {/* Sessions Sidebar */}
      {isSidebarOpen && (
        <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col h-full shrink-0 z-30 shadow-2xl">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-extrabold text-white text-xs flex items-center gap-2.5 tracking-tight uppercase opacity-80">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">history</span>
              {CHAT_TEXTS.SIDEBAR.TITLE}
            </h2>
            <button 
              onClick={startNewChat}
              className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-all active:scale-95 border border-indigo-500/20"
              title={CHAT_TEXTS.SIDEBAR.NEW_CHAT_TOOLTIP}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-sm text-slate-500 font-medium">{CHAT_TEXTS.SIDEBAR.NO_SESSIONS}</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="relative group px-1">
                  <button
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      currentSessionId === session.id 
                        ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20" 
                        : "border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <span className={`material-symbols-outlined text-[16px] ${currentSessionId === session.id ? "text-indigo-400" : "text-slate-500"}`}>
                        chat_bubble
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">{session.title}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border border-white/5 shadow-xl"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-950 relative">
        {/* Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20 shadow-xl">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            <div className="min-w-0">
               <h1 className="font-black text-white text-sm flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                </span>
                <span className="truncate tracking-tight max-w-[200px]" title={docData?.file_name}>
                  {docData?.file_name || CHAT_TEXTS.HEADER.LOADING_DOC}
                </span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {[
              { onClick: handleGetSummary, icon: "summarize", label: CHAT_TEXTS.HEADER.ACTIONS.SUMMARY, color: "bg-purple-500/10 text-purple-400 hover:bg-purple-500 border-purple-500/20" },
              { onClick: handleGetQuiz, icon: "quiz", label: CHAT_TEXTS.HEADER.ACTIONS.QUIZ, color: "bg-orange-500/10 text-orange-400 hover:bg-orange-500 border-orange-500/20" },
              { onClick: () => router.push(`/mindmap/${documentId}`), icon: "hub", label: CHAT_TEXTS.HEADER.ACTIONS.MINDMAP, color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500 border-blue-500/20" }
            ].map((btn, i) => (
              <button 
                key={i}
                onClick={btn.onClick}
                className={`flex items-center justify-center h-10 w-10 rounded-xl ${btn.color} hover:text-white transition-all duration-300 border shadow-lg group relative`}
              >
                <span className="material-symbols-outlined text-[20px]">{btn.icon}</span>
                {/* Modern Note/Tooltip */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl z-[100]">
                  {btn.label}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900"></div>
                </div>
              </button>
            ))}
          </div>
        </header>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-8 custom-scrollbar bg-slate-950/50 relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-xl mx-auto py-1 animate-in fade-in zoom-in duration-700">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[32px] flex items-center justify-center shadow-[0_15px_45px_rgba(99,102,241,0.3)]">
                   <span className="material-symbols-outlined text-[40px] drop-shadow-2xl">auto_awesome</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 border-[3px] border-slate-950 rounded-xl shadow-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-400 text-[16px] animate-pulse">chat</span>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">{CHAT_TEXTS.WELCOME.TITLE}</h2>
                <p className="text-slate-400 text-sm leading-relaxed px-4 font-medium opacity-80">
                  {CHAT_TEXTS.WELCOME.SUBTITLE}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full px-8">
                {CHAT_TEXTS.WELCOME.SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="py-3 px-4 text-[12px] font-bold text-slate-300 bg-white/5 border border-white/5 rounded-xl hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white transition-all text-left shadow-lg group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-indigo-400/50 text-[14px] group-hover:text-indigo-400 transition-colors shrink-0">send</span>
                      <span>{q}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-8 pb-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-4 animate-in slide-in-from-bottom-4 duration-500 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-xl border ${
                    msg.role === "user" 
                    ? "bg-slate-800 text-indigo-300 border-indigo-500/20" 
                    : "bg-indigo-600 text-white border-white/20"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {msg.role === "user" ? "person" : "auto_awesome"}
                    </span>
                  </div>
                  <div className={`flex-1 space-y-3 pt-0.5 ${msg.role === "user" ? "text-right flex flex-col items-end" : ""}`}>
                    <div className={`max-w-[85%] prose prose-invert prose-slate prose-sm leading-relaxed shadow-xl ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white p-4 rounded-[24px] rounded-tr-none border border-white/10 prose-p:text-white prose-strong:text-white font-medium" 
                        : "bg-white/[0.04] backdrop-blur-md p-6 rounded-[24px] rounded-tl-none border border-white/10 font-medium text-slate-200"
                    }`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 py-2 animate-in fade-in duration-300">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white border border-white/20 shadow-indigo-500/20 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">{CHAT_TEXTS.MESSAGES.AI_ANALYZING}</p>
                    <div className="flex gap-1.5 items-center bg-white/5 px-3 py-1.5 rounded-full w-fit border border-white/5">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        <div className="px-6 py-4 pb-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 shrink-0 z-20">
          <div className="max-w-2xl mx-auto relative cursor-text">
            <form 
              onSubmit={handleSendMessage}
              className="relative group flex items-center"
            >
              <div className="absolute left-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={CHAT_TEXTS.INPUT.PLACEHOLDER}
                className="w-full bg-white/[0.03] text-white py-3 pl-14 pr-14 rounded-2xl focus:outline-none focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all border border-white/5 focus:border-indigo-500/30 text-xs font-bold shadow-2xl placeholder:text-slate-600"
                style={{ paddingLeft: '50px' }}
                disabled={isLoading}
              />
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? handleCancel : undefined}
                disabled={!input.trim() && !isLoading}
                className={`absolute right-1.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  (input.trim() || isLoading)
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95" 
                    : "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isLoading ? "stop_circle" : "send"}
                </span>
              </button>
            </form>
            <div className="flex justify-center items-center px-4 mt-3">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-70">
                {CHAT_TEXTS.INPUT.DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals with Dark Theme */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="flex items-center justify-center w-full h-full p-4 sm:p-8">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-4 tracking-tight">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  showModal === 'summary' ? 'bg-purple-500/20 text-purple-400' : 
                  showModal === 'questions' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  <span className="material-symbols-outlined text-[28px]">
                    {showModal === 'summary' ? 'summarize' : 
                     showModal === 'questions' ? 'format_list_numbered' : 'quiz'}
                  </span>
                </span>
                {showModal === 'summary' ? CHAT_TEXTS.MODALS.TITLES.SUMMARY : 
                 showModal === 'questions' ? CHAT_TEXTS.MODALS.TITLES.QUESTIONS : CHAT_TEXTS.MODALS.TITLES.QUIZ}
              </h3>
              <button 
                onClick={() => setShowModal(null)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400 border border-white/10 active:scale-95"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-slate-200">
              {showModal === 'summary' ? (
                isSummaryLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-6">
                    <div className="w-16 h-16 border-4 border-white/5 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">{CHAT_TEXTS.MODALS.LOADING.SUMMARY}</p>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none prose-p:leading-loose prose-li:my-2 prose-h3:text-white prose-strong:text-indigo-300">
                    <ReactMarkdown>{String(summary || CHAT_TEXTS.MODALS.EMPTY.SUMMARY)}</ReactMarkdown>
                  </div>
                )
              ) : showModal === 'questions' ? (
                isStudyQuestionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-6">
                    <div className="w-16 h-16 border-4 border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">{CHAT_TEXTS.MODALS.LOADING.QUESTIONS}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-emerald-300 mb-8 bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 text-sm font-bold leading-relaxed">
                       ✨ {CHAT_TEXTS.MODALS.QUESTIONS_HINT}
                    </p>
                    {studyQuestions ? studyQuestions.map((q, idx) => (
                      <div 
                        key={idx} 
                        className="group flex gap-6 p-6 rounded-3xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/10"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-500/20">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200 font-bold text-lg leading-relaxed">{q}</p>
                          <button 
                            onClick={() => {
                              setShowModal(null);
                              setInput(`Hãy giúp mình trả lời câu hỏi ôn tập: ${q}`);
                            }}
                            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-black flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          >
                            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                            {CHAT_TEXTS.MODALS.ASK_AI_TOOLTIP}
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-slate-500 text-center py-10">{CHAT_TEXTS.MODALS.EMPTY.QUESTIONS}</p>}
                  </div>
                )
              ) : (
                isQuizLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-6">
                    <div className="w-16 h-16 border-4 border-white/5 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">{CHAT_TEXTS.MODALS.LOADING.QUIZ}</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {quiz ? quiz.map((item, idx) => (
                      <div key={idx} className="space-y-6 bg-white/[0.03] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                        <p className="font-black text-xl text-white flex items-start gap-3">
                          <span className="text-orange-400 whitespace-nowrap shrink-0">CÂU {idx + 1}:</span>
                          <span className="tracking-tight leading-tight">{item.question}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {item.options.map((opt: string, optIdx: number) => (
                            <div 
                              key={optIdx}
                              className={`p-5 rounded-2xl border text-[15px] font-bold transition-all ${
                                optIdx === item.correct_index 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                                  : "bg-white/5 border-white/10 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${optIdx === item.correct_index ? "bg-emerald-400" : "bg-slate-700"}`}></span>
                                {opt}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/20">
                           <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                             <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                             Giải thích chuyên sâu
                           </p>
                           <p className="text-slate-300 leading-loose font-medium text-[15px]">{item.explanation}</p>
                        </div>
                      </div>
                    )) : <p className="text-slate-500 text-center py-10">{CHAT_TEXTS.MODALS.EMPTY.QUIZ}</p>}
                  </div>
                )
              )}
            </div>
            
            <div className="p-8 border-t border-white/5 bg-slate-900 flex justify-end gap-4 z-10 translate-y-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <button 
                onClick={() => setShowModal(null)}
                className="px-8 py-3.5 font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-white/5"
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
                  className="px-8 py-3.5 font-black bg-indigo-600 text-white rounded-2xl shadow-[0_10px_25px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all uppercase tracking-widest text-sm"
                >
                  {CHAT_TEXTS.MODALS.BUTTONS.DOWNLOAD_SUMMARY}
                </button>
              )}
            </div>
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
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
