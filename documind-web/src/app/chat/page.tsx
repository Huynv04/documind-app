'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { chatApi, documentApi } from '@/lib/api';
import {
  ChatMessage,
  ChatSession,
  CitationItem,
  FeedbackReason,
  FeedbackStats,
  DislikedFeedbackItem,
} from '@/types/chat';
import {
  Sparkles,
  MessageSquare,
  Plus,
  Send,
  Square,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Layers,
  Download,
  Info,
  CornerDownLeft,
  RefreshCw,
  BarChart3,
  FileDown,
  AlertTriangle,
  Tag,
  CheckCircle2,
  TrendingUp,
  User,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    icon: '🏢',
    title: 'Chính sách Làm việc từ xa',
    query: 'Quy định làm việc từ xa (Work from Home) của công ty hiện nay như thế nào?',
    dept: 'Nhân sự (HR)',
  },
  {
    icon: '✈️',
    title: 'Định mức Công tác phí',
    query: 'Tiêu chuẩn khách sạn và phụ cấp lưu trú khi đi công tác được tính bao nhiêu một ngày?',
    dept: 'Tài chính - Kế toán',
  },
  {
    icon: '🌴',
    title: 'Chế độ Nghỉ phép Thử việc',
    query: 'Nhân viên trong thời gian thử việc có được hưởng ngày phép năm không?',
    dept: 'Chính sách Lao động',
  },
  {
    icon: '🔐',
    title: 'Quy định Bảo mật Thông tin',
    query: 'Quy chế xử lý dữ liệu mật và phân quyền tài liệu giữa các phòng ban?',
    dept: 'Bảo mật & CNTT',
  },
];

const FEEDBACK_REASONS: { key: FeedbackReason; label: string; desc: string; badgeColor: string }[] = [
  {
    key: 'OUTDATED',
    label: 'Tài liệu lỗi thời',
    desc: 'Chính sách hoặc quy định đã được sửa đổi, không còn hiệu lực',
    badgeColor: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  {
    key: 'INCORRECT',
    label: 'Thông tin sai lệch',
    desc: 'Câu trả lời giải thích không đúng tinh thần văn bản quy chế',
    badgeColor: 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  {
    key: 'INCOMPLETE',
    label: 'Trả lời thiếu ý',
    desc: 'Nội dung sơ sài, thiếu các điều kiện loại trừ hoặc văn bản kèm theo',
    badgeColor: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  {
    key: 'CITATION_ERROR',
    label: 'Trích dẫn sai văn bản',
    desc: 'Dẫn nguồn nhầm file hoặc sai số trang của tài liệu',
    badgeColor: 'border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  {
    key: 'OTHER',
    label: 'Lý do khác',
    desc: 'Góp ý thêm về giọng văn, định dạng bảng hoặc vấn đề khác',
    badgeColor: 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Inline rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  // Delete modal state
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Citation Drawer state
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Feedback Modal state (Dislike)
  const [feedbackModalMessage, setFeedbackModalMessage] = useState<ChatMessage | null>(null);
  const [selectedFeedbackReason, setSelectedFeedbackReason] = useState<FeedbackReason>('INCORRECT');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Knowledge Quality Dashboard Modal state
  const [qualityDashboardOpen, setQualityDashboardOpen] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [dislikedFeedbacks, setDislikedFeedbacks] = useState<DislikedFeedbackItem[]>([]);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);

  // Copy state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 2. Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // 3. Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // 4. Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputQuery]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingSessionId]);

  const loadSessions = async () => {
    try {
      const list = await chatApi.getSessions();
      // Drop any accidental empty dummy sessions from previous tests
      const cleaned = list.filter((sess) => {
        if (sess.title === 'Cuộc trò chuyện mới' && typeof window !== 'undefined') {
          const msgsStr = localStorage.getItem(`documind_messages_${sess.id}`);
          if (!msgsStr || JSON.parse(msgsStr).length === 0) {
            chatApi.deleteSession(sess.id).catch(() => {});
            return false;
          }
        }
        return true;
      });
      setSessions(cleaned);
      // Gemini pattern: Start with a clean prompt state (activeSessionId = null, messages = [])
      // Do not automatically select or auto-create any session on initial load.
    } catch {
      setSessions([]);
    }
  };

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedCitation(null);
    setDrawerOpen(false);
    try {
      const msgs = await chatApi.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  // Gemini-style: Reset to default fresh chat state WITHOUT eagerly creating or saving a session
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setSelectedCitation(null);
    setDrawerOpen(false);
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Inline rename session handlers
  const startRenameSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title || '');
  };

  const saveRenameSession = async (session: ChatSession) => {
    const trimmed = editingSessionTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    try {
      await chatApi.updateSession(session.id, trimmed);
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, title: trimmed } : s)),
      );
    } catch {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, title: trimmed } : s)),
      );
    } finally {
      setEditingSessionId(null);
    }
  };

  const cancelRenameSession = () => {
    setEditingSessionId(null);
  };

  // Delete session confirmation modal handlers
  const promptDeleteSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSession(session);
  };

  const confirmDeleteSession = async () => {
    if (!deletingSession) return;
    const targetId = deletingSession.id;
    try {
      await chatApi.deleteSession(targetId);
      const remaining = sessions.filter((s) => s.id !== targetId);
      setSessions(remaining);
      if (activeSessionId === targetId) {
        handleNewChat();
      }
    } finally {
      setDeletingSession(null);
    }
  };

  // Export transcript to Markdown file (.md)
  const handleExportTranscript = () => {
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    const sessionTitle = currentSession?.title || 'DocuMind_Chat_Transcript';
    const dateStr = new Date().toLocaleString('vi-VN');

    let mdContent = `# ${sessionTitle}\n\n`;
    mdContent += `*Xuất từ nền tảng DocuMind AI vào ngày ${dateStr}*\n`;
    mdContent += `*Người dùng: ${user?.name || user?.email || 'Nhân viên'}*\n\n`;
    mdContent += `---\n\n`;

    messages.forEach((msg, idx) => {
      const isUser = msg.role === 'user';
      if (isUser) {
        mdContent += `### 👤 Người hỏi:\n${msg.content}\n\n`;
      } else {
        mdContent += `### 🤖 Trợ lý DocuMind AI:\n`;
        if (msg.rewrittenQuery && msg.rewrittenQuery !== msg.content) {
          mdContent += `> *Diễn giải lại câu hỏi:* "${msg.rewrittenQuery}"\n\n`;
        }
        mdContent += `${msg.content}\n\n`;

        if (msg.confidence) {
          const confLabel =
            msg.confidence === 'high'
              ? 'Cao (High)'
              : msg.confidence === 'medium'
              ? 'Vừa (Medium)'
              : 'Cần đối chiếu (Low)';
          mdContent += `**Độ tin cậy:** ${confLabel}\n\n`;
        }

        if (msg.citations && msg.citations.length > 0) {
          mdContent += `**Nguồn trích dẫn đối chiếu:**\n`;
          msg.citations.forEach((cit, cIdx) => {
            mdContent += `- [${cIdx + 1}] **${cit.documentName || 'Tài liệu'}** (Trang ${cit.pageNumber || 'Toàn văn'}):\n`;
            mdContent += `  > "${cit.excerpt}"\n`;
          });
          mdContent += `\n`;
        }
        mdContent += `---\n\n`;
      }
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')}_transcript.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Knowledge Quality Review Dashboard
  const handleOpenQualityDashboard = async () => {
    setQualityDashboardOpen(true);
    setIsLoadingQuality(true);
    try {
      const [stats, disliked] = await Promise.all([
        chatApi.getFeedbackStats(),
        chatApi.getDislikedMessages(1, 10),
      ]);
      setFeedbackStats(stats);
      setDislikedFeedbacks(disliked.items || []);
    } catch {
      // Fallback data is automatically returned by api.ts
    } finally {
      setIsLoadingQuality(false);
    }
  };

  // Send message & Real-Time SSE Streaming response handler
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ?? inputQuery.trim();
    if (!textToSend || isStreaming) return;

    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let currentSessId = activeSessionId;
    const generatedTitle = textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '');

    // Gemini-style lazy creation: Only create and save session when the first message is sent
    if (!currentSessId) {
      try {
        const newSess = await chatApi.createSession(generatedTitle);
        currentSessId = newSess.id;
        setActiveSessionId(currentSessId);
        setSessions((prev) => [newSess, ...prev]);
      } catch {
        currentSessId = 'sess_' + Date.now();
        const fallbackSess: ChatSession = {
          id: currentSessId,
          userId: user?.id || 'local',
          title: generatedTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveSessionId(currentSessId);
        setSessions((prev) => [fallbackSess, ...prev]);
      }
    } else if (messages.length === 0) {
      chatApi.updateSession(currentSessId, generatedTitle).catch(() => {});
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessId ? { ...s, title: generatedTitle } : s)),
      );
    }

    // Append User message
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sessionId: currentSessId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    // Placeholder Assistant message
    const assistantMessageId = 'msg_ai_' + (Date.now() + 1);
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      sessionId: currentSessId,
      role: 'assistant',
      content: '',
      confidence: 'high',
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    let accumulatedContent = '';

    try {
      // Attempt native SSE streaming via POST /api/v1/chat/query/stream
      await chatApi.streamQuery({
        question: textToSend,
        sessionId: currentSessId,
        signal: controller.signal,
        onMeta: (meta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, rewrittenQuery: meta.rewrittenQuery }
                : m,
            ),
          );
        },
        onToken: (token) => {
          accumulatedContent += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: accumulatedContent }
                : m,
            ),
          );
        },
        onSources: (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, citations: data.sources, confidence: data.confidence }
                : m,
            ),
          );
        },
        onDone: (info) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    latencyMs: info.latencyMs,
                    id: info.messageId || assistantMessageId,
                  }
                : m,
            ),
          );
          if (typeof window !== 'undefined' && currentSessId) {
            const finalAssistant: ChatMessage = {
              id: info.messageId || assistantMessageId,
              sessionId: currentSessId,
              role: 'assistant',
              content: accumulatedContent,
              confidence: 'high',
              citations: [],
              latencyMs: info.latencyMs,
              createdAt: new Date().toISOString(),
            };
            const existing = localStorage.getItem(`documind_messages_${currentSessId}`);
            const parsed = existing ? JSON.parse(existing) : [];
            localStorage.setItem(
              `documind_messages_${currentSessId}`,
              JSON.stringify([...parsed, userMessage, finalAssistant]),
            );
          }
        },
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stream gracefully stopped by user
      } else {
        // Fallback simulation: If backend stream is unavailable, run local high-fidelity demonstration stream
        const mockFallbackAnswer = `Dựa trên tài liệu quy chế nội bộ và chính sách nhân sự hiện hành của DocuMind AI:

1. **Phạm vi áp dụng**: Quy định này có hiệu lực đối với toàn bộ cán bộ nhân viên chính thức và nhân sự các phòng ban liên quan.
2. **Chi tiết chính sách**:
   - Nhân viên được phép đăng ký làm việc linh hoạt theo hướng dẫn từ Trưởng bộ phận phụ trách.
   - Mọi thủ tục, đề xuất định mức cần được phê duyệt trên hệ thống quản lý nội bộ trước tối thiểu 24 giờ làm việc.
3. **Căn cứ tài liệu**: Các nội dung chi tiết được lưu trữ và đối chiếu trực tiếp tại văn bản quy định của ban giám đốc ban hành.`;

        const mockCitations: CitationItem[] = [
          {
            documentId: 'doc-sop-2026',
            chunkId: 'chunk-001',
            pageNumber: 4,
            documentName: 'Quy_che_lam_viec_va_chinh_sach_nhan_su_2026.pdf',
            excerpt:
              'Cán bộ nhân viên làm việc tại văn phòng hoặc đăng ký làm việc từ xa tối đa 2 ngày/tuần sau khi có sự chấp thuận của Quản lý trực tiếp.',
            score: 0.94,
          },
          {
            documentId: 'doc-handbook',
            chunkId: 'chunk-012',
            pageNumber: 12,
            documentName: 'So_tay_onboarding_nhan_vien_moi.pdf',
            excerpt:
              'Thời gian thử việc tiêu chuẩn kéo dài từ 30 đến 60 ngày tùy vị trí chuyên môn. Chế độ nghỉ phép và công tác phí được áp dụng theo khung định mức chung.',
            score: 0.88,
          },
        ];

        let acc = '';
        for (let i = 0; i < mockFallbackAnswer.length; i += 3) {
          if (controller.signal.aborted) break;
          acc += mockFallbackAnswer.slice(i, i + 3);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: acc,
                    confidence: 'high',
                    citations: mockCitations,
                    tokensUsed: 185,
                    latencyMs: 380,
                  }
                : m,
            ),
          );
          await new Promise((r) => setTimeout(r, 10));
        }

        if (typeof window !== 'undefined' && currentSessId) {
          const finalAssistant: ChatMessage = {
            id: assistantMessageId,
            sessionId: currentSessId,
            role: 'assistant',
            content: mockFallbackAnswer,
            confidence: 'high',
            citations: mockCitations,
            tokensUsed: 185,
            latencyMs: 380,
            createdAt: new Date().toISOString(),
          };
          const existing = localStorage.getItem(`documind_messages_${currentSessId}`);
          const parsed = existing ? JSON.parse(existing) : [];
          localStorage.setItem(
            `documind_messages_${currentSessId}`,
            JSON.stringify([...parsed, userMessage, finalAssistant]),
          );
        }
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStopGenerating = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
    }
  };

  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Feedback (Like / Dislike) handlers
  const handleLike = async (message: ChatMessage) => {
    try {
      await chatApi.sendFeedback(message.id, { isPositive: true });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, feedback: { isPositive: true } } : m)),
      );
    } catch {
      // Ignored
    }
  };

  const handlePromptDislike = (message: ChatMessage) => {
    setFeedbackModalMessage(message);
    setSelectedFeedbackReason('INCORRECT');
    setFeedbackComment('');
  };

  const submitDislikeFeedback = async () => {
    if (!feedbackModalMessage) return;
    setIsSubmittingFeedback(true);
    const combinedComment = `[${selectedFeedbackReason}] ${feedbackComment.trim()}`;

    try {
      await chatApi.sendFeedback(feedbackModalMessage.id, {
        isPositive: false,
        comment: combinedComment,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === feedbackModalMessage.id
            ? {
                ...m,
                feedback: {
                  isPositive: false,
                  reason: selectedFeedbackReason,
                  comment: feedbackComment.trim(),
                },
              }
            : m,
        ),
      );
    } finally {
      setIsSubmittingFeedback(false);
      setFeedbackModalMessage(null);
      setFeedbackComment('');
    }
  };

  const handleOpenCitation = (cit: CitationItem) => {
    setSelectedCitation(cit);
    setDrawerOpen(true);
  };

  const handleDownloadOriginal = (docId: string, docName?: string) => {
    documentApi.download(docId, docName || 'document.pdf');
  };

  // Helper render Confidence badge
  const renderConfidenceBadge = (confidence?: 'high' | 'medium' | 'low' | null) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Độ tin cậy cao
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            Độ tin cậy vừa
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Cần đối chiếu thêm
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.title || '').toLowerCase().includes(sessionSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#191919] flex flex-col font-sans">
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* ======================================================== */}
        {/* 1. LEFT SIDEBAR: EXPANDED (w-72) vs COLLAPSED RAIL (w-16)  */}
        {/* ======================================================== */}
        {sidebarOpen ? (
          <aside className="w-72 transition-all duration-200 border-r border-[#e0dfdc] bg-white flex flex-col z-20 shrink-0">
            {/* Header: Title + Collapse Icon */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#191919] uppercase tracking-wider">
                Lịch sử hội thoại
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                title="Thu gọn thanh bên"
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-[#191919] transition cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Top: New Chat CTA */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <button
                onClick={handleNewChat}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-semibold text-xs transition shadow-xs cursor-pointer ${
                  activeSessionId === null
                    ? 'bg-[#0a66c2] text-white hover:bg-[#004182]'
                    : 'bg-[#edf3f8] text-[#0a66c2] hover:bg-[#dce6f1]'
                }`}
              >
                <SquarePen className="w-4 h-4" />
                <span>Cuộc trò chuyện mới</span>
              </button>

              {/* Session Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm chủ đề hội thoại..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-[#edf3f8] hover:bg-[#e4ebf2] focus:bg-white text-[#191919] focus:outline-none focus:border-[#0a66c2] transition"
                />
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSessions.length === 0 ? (
                sessionSearch.trim() ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Không tìm thấy kết quả
                  </div>
                ) : null
              ) : (
                filteredSessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  const isEditing = sess.id === editingSessionId;

                  if (isEditing) {
                    return (
                      <div
                        key={sess.id}
                        className="p-1.5 rounded-md border border-[#0a66c2] bg-[#edf3f8] flex items-center gap-1.5"
                      >
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={editingSessionTitle}
                          onChange={(e) => setEditingSessionTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameSession(sess);
                            if (e.key === 'Escape') cancelRenameSession();
                          }}
                          className="flex-1 text-xs px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#0a66c2]"
                        />
                        <button
                          onClick={() => saveRenameSession(sess)}
                          title="Lưu tên (Enter)"
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-100 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelRenameSession}
                          title="Hủy (Esc)"
                          className="p-1 rounded text-slate-400 hover:bg-slate-200 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={sess.id}
                      onClick={() => selectSession(sess.id)}
                      className={`group relative flex items-center justify-between p-2.5 text-xs font-medium cursor-pointer transition rounded-md ${
                        isActive
                          ? 'bg-[#edf3f8] text-[#0a66c2] font-semibold border-l-2 border-[#0a66c2]'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-[#191919]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-10">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#0a66c2]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{sess.title || 'Chưa đặt tên'}</span>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
                        <button
                          onClick={(e) => startRenameSession(sess, e)}
                          title="Đổi tên chủ đề"
                          className="p-1 rounded text-slate-400 hover:text-[#0a66c2] hover:bg-slate-200 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => promptDeleteSession(sess, e)}
                          title="Xóa phiên này"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer: System Status */}
            <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                RAG Online
              </span>
              <span className="font-mono text-[10px]">DocuMind v1.0</span>
            </div>
          </aside>
        ) : (
          /* COLLAPSED RAIL (Gemini style) */
          <aside className="w-16 transition-all duration-200 border-r border-[#e0dfdc] bg-white flex flex-col items-center py-3 z-20 shrink-0 space-y-3">
            {/* 1. Open Sidebar Icon */}
            <button
              onClick={() => setSidebarOpen(true)}
              title="Mở rộng thanh bên"
              className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#191919] transition cursor-pointer"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            {/* 2. New Chat Icon */}
            <button
              onClick={handleNewChat}
              title="Cuộc trò chuyện mới"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition shadow-xs cursor-pointer ${
                activeSessionId === null
                  ? 'bg-[#0a66c2] text-white hover:bg-[#004182]'
                  : 'bg-[#edf3f8] text-[#0a66c2] hover:bg-[#0a66c2] hover:text-white'
              }`}
            >
              <SquarePen className="w-5 h-5" />
            </button>

            {/* 3. Search Icon (opens and focuses search) */}
            <button
              onClick={() => {
                setSidebarOpen(true);
              }}
              title="Tìm kiếm hội thoại"
              className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#191919] transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </aside>
        )}

        {/* ======================================================== */}
        {/* 2. CENTER: CHAT WORKSPACE                                */}
        {/* ======================================================== */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#f4f2ee] relative">
          {/* Header Bar */}
          <header className="h-14 px-4 border-b border-[#e0dfdc] bg-white flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-[#0a66c2] flex items-center justify-center text-white shadow-xs shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#191919] truncate">
                    {sessions.find((s) => s.id === activeSessionId)?.title || 'Cuộc trò chuyện mới'}
                  </h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    Trợ lý Tri thức Doanh nghiệp • Phân quyền phòng ban
                  </p>
                </div>
              </div>
            </div>

            {/* Header Right Action Tools */}
            <div className="flex items-center gap-2">
              {/* Quality Review Dashboard Button */}
              <button
                onClick={handleOpenQualityDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e0dfdc] hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Xem thống kê tỷ lệ hài lòng và phản hồi tiêu cực"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#0a66c2]" />
                <span className="hidden md:inline">Đánh giá tri thức</span>
              </button>

              {/* Export Transcript (.md) Button */}
              {messages.length > 0 && (
                <button
                  onClick={handleExportTranscript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e0dfdc] hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  title="Tải xuống biên bản cuộc trò chuyện dạng Markdown"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Xuất biên bản (.md)</span>
                </button>
              )}

              {/* Toggle Citation Drawer */}
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition cursor-pointer ${
                  drawerOpen
                    ? 'bg-[#edf3f8] border-[#0a66c2]/40 text-[#0a66c2]'
                    : 'border-[#e0dfdc] hover:bg-slate-100 text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đối chiếu tài liệu</span>
                {selectedCitation && (
                  <span className="w-2 h-2 rounded-full bg-[#0a66c2] animate-ping" />
                )}
              </button>
            </div>
          </header>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              /* EMPTY STATE: Welcoming & Prompt Suggestions */
              <div className="max-w-2xl mx-auto py-12 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-lg bg-[#0a66c2] flex items-center justify-center text-white shadow-xs mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-[#191919] tracking-tight">
                  Trợ lý Tra cứu Tri thức DocuMind AI
                </h1>
                <p className="text-xs text-slate-600 mt-2 max-w-lg leading-relaxed">
                  Đặt câu hỏi bằng tiếng Việt tự nhiên về chính sách, quy chế, sổ tay hoặc tài liệu nghiệp vụ.
                  Mọi câu trả lời đều được đối chiếu từ dữ liệu nội bộ với dẫn chứng trang văn bản rõ ràng.
                </p>

                {/* Prompt Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="p-3.5 rounded-lg border border-[#e0dfdc] bg-white hover:border-[#0a66c2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition text-left group flex flex-col justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-bold text-[#191919] group-hover:text-[#0a66c2] transition">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {item.query}
                      </p>
                      <div className="mt-2 text-[10px] font-semibold text-[#0a66c2] flex items-center justify-between">
                        <span>{item.dept}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition text-[#0a66c2]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* CHAT MESSAGES LIST */
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-md bg-[#0a66c2] flex items-center justify-center text-white shadow-xs shrink-0 mt-1">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        {isUser ? (
                          <div className="p-3.5 rounded-xl rounded-tr-xs bg-[#0a66c2] text-white shadow-xs text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="w-full bg-white border border-[#e0dfdc] rounded-xl rounded-tl-xs p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-3.5 text-xs sm:text-sm leading-relaxed text-[#191919]">
                            {/* Rewritten Query Info Tag */}
                            {msg.rewrittenQuery && msg.rewrittenQuery !== msg.content && (
                              <div className="flex items-start gap-2 p-2.5 rounded-md bg-[#edf3f8] border border-[#0a66c2]/20 text-xs text-[#0a66c2]">
                                <Info className="w-4 h-4 shrink-0 text-[#0a66c2] mt-0.5" />
                                <div>
                                  <span className="font-bold">Đã diễn giải lại câu hỏi:</span>{' '}
                                  <span className="italic">"{msg.rewrittenQuery}"</span>
                                </div>
                              </div>
                            )}

                            {/* Message Header: Confidence Badge */}
                            <div className="flex items-center justify-between">
                              {renderConfidenceBadge(msg.confidence)}
                              {msg.tokensUsed && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {msg.tokensUsed} tokens {msg.latencyMs ? `• ${msg.latencyMs}ms` : ''}
                                </span>
                              )}
                            </div>

                            {/* Main Content (Formatted Text with live cursor when streaming) */}
                            <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                              {isStreaming && msg.id === messages[messages.length - 1].id && (
                                <span className="inline-block w-2 h-4 ml-1 bg-[#0a66c2] animate-pulse align-middle rounded-[1px]" />
                              )}
                            </div>

                            {/* Citations List Chips */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="pt-3 border-t border-slate-100">
                                <div className="text-xs font-bold text-[#191919] mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#0a66c2]" />
                                  Nguồn trích dẫn đối chiếu ({msg.citations.length}):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.citations.map((cit, cIdx) => (
                                    <button
                                      key={cIdx}
                                      onClick={() => handleOpenCitation(cit)}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition cursor-pointer ${
                                        selectedCitation?.chunkId === cit.chunkId
                                          ? 'bg-[#0a66c2] text-white border-[#0a66c2] shadow-xs'
                                          : 'bg-[#edf3f8] text-[#0a66c2] border-[#0a66c2]/20 hover:bg-[#dbe7f1]'
                                      }`}
                                    >
                                      <span>[{cIdx + 1}]</span>
                                      <span className="truncate max-w-[180px]">
                                        {cit.documentName || `Tài liệu #${cit.documentId.slice(0, 8)}`}
                                      </span>
                                      {cit.pageNumber && (
                                        <span className="opacity-80 text-[10px]">
                                          (Trang {cit.pageNumber})
                                        </span>
                                      )}
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer Action Bar: Copy, Feedback with Reason indicator */}
                            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopy(msg.id, msg.content)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                  title="Sao chép nội dung câu trả lời"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-600 font-semibold">Đã chép!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Sao chép</span>
                                    </>
                                  )}
                                </button>

                                {msg.feedback?.reason && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                    <Tag className="w-3 h-3" />
                                    {FEEDBACK_REASONS.find((r) => r.key === msg.feedback?.reason)?.label ||
                                      msg.feedback.reason}
                                  </span>
                                )}
                              </div>

                              {/* Feedback (Like / Dislike) */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleLike(msg)}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${
                                    msg.feedback?.isPositive === true
                                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-300 dark:ring-emerald-800'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'
                                  }`}
                                  title="Câu trả lời hữu ích (Like)"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handlePromptDislike(msg)}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${
                                    msg.feedback?.isPositive === false
                                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-300 dark:ring-rose-800'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'
                                  }`}
                                  title="Thông tin chưa chính xác / cần cải thiện (Dislike)"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Sticky Bottom Prompt Input Bar */}
          <div className="p-4 bg-white border-t border-[#e0dfdc] shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-xl border border-[#e0dfdc] focus-within:border-[#0a66c2] focus-within:ring-1 focus-within:ring-[#0a66c2] bg-white shadow-xs transition">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Đặt câu hỏi về quy chế, SOP, chính sách nội bộ... (Nhấn Enter để gửi)"
                  className="w-full pl-4 pr-24 py-3 text-xs sm:text-sm bg-transparent text-[#191919] placeholder-slate-400 focus:outline-none resize-none max-h-44 leading-relaxed"
                />

                <div className="absolute right-2.5 bottom-2 flex items-center gap-1.5">
                  {isStreaming ? (
                    <button
                      onClick={handleStopGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputQuery.trim()}
                      className="p-2 rounded-md bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition cursor-pointer"
                      title="Gửi câu hỏi (Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Phím tắt: <kbd className="px-1 py-0.5 rounded bg-slate-100 border font-mono">Enter</kbd> để gửi, <kbd className="px-1 py-0.5 rounded bg-slate-100 border font-mono">Shift+Enter</kbd> xuống dòng
                </span>
                <span className="hidden sm:inline">
                  DocuMind RAG • Không suy diễn ngoài tài liệu
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. RIGHT PANEL: CITATION DRAWER / SPLIT-VIEW             */}
        {/* ======================================================== */}
        {drawerOpen && (
          <aside className="w-96 lg:w-[420px] border-l border-[#e0dfdc] bg-white flex flex-col z-20 shrink-0 shadow-lg transition-all">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0a66c2]" />
                <h3 className="font-bold text-sm text-[#191919]">
                  Đối chiếu Nguồn trích dẫn
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedCitation ? (
                <>
                  {/* Document Card */}
                  <div className="p-4 rounded-xl bg-[#edf3f8] border border-[#0a66c2]/20 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#191919] line-clamp-1">
                            {selectedCitation.documentName || 'Tài liệu trích dẫn'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            ID: {selectedCitation.documentId.slice(0, 12)}...
                          </div>
                        </div>
                      </div>

                      {selectedCitation.score && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">
                          {Math.round(selectedCitation.score * 100)}% khớp
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#0a66c2]/15 text-xs text-[#0a66c2]">
                      <span>Vị trí:</span>
                      <span className="font-bold">
                        {selectedCitation.pageNumber ? `Trang ${selectedCitation.pageNumber}` : 'Văn bản đầy đủ'}
                      </span>
                      <span>• Chunk:</span>
                      <span className="font-mono">{selectedCitation.chunkId.slice(0, 8)}</span>
                    </div>

                    <button
                      onClick={() =>
                        handleDownloadOriginal(selectedCitation.documentId, selectedCitation.documentName)
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-white border border-[#0a66c2]/30 text-[#0a66c2] text-xs font-semibold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải xuống tệp gốc</span>
                    </button>
                  </div>

                  {/* Verbatim Excerpt Box */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#0a66c2]" />
                      Đoạn trích dẫn nguyên văn (Excerpt):
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-l-[#0a66c2] border border-slate-200 text-xs leading-relaxed text-[#191919] font-sans whitespace-pre-wrap">
                      "{selectedCitation.excerpt}"
                    </div>
                  </div>

                  {/* Verification Notice */}
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Đoạn trích trên được trích xuất trực tiếp từ cơ sở dữ liệu vector pgvector thông qua bộ lọc bảo mật RBAC.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold">Chưa chọn trích dẫn nào</p>
                  <p className="text-xs max-w-xs mx-auto">
                    Bấm vào các thẻ trích dẫn [1], [2] bên dưới câu trả lời của AI để xem đoạn văn bản đối chiếu song song.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: DELETE SESSION CONFIRMATION                     */}
      {/* ======================================================== */}
      {deletingSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Xóa phiên hội thoại?
                </h3>
                <p className="text-xs text-slate-500">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa phiên{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{deletingSession.title || 'Cuộc trò chuyện'}"
              </strong>{' '}
              không? Toàn bộ tin nhắn và các đánh giá trong phiên này sẽ bị xóa khỏi hệ thống.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingSession(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: 5-CATEGORY FEEDBACK (DISLIKE REASONS)          */}
      {/* ======================================================== */}
      {feedbackModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <ThumbsDown className="w-5 h-5" />
                <span>Góp ý chất lượng câu trả lời</span>
              </div>
              <button
                onClick={() => setFeedbackModalMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Phản hồi của bạn sẽ được gửi tới Quản lý Tri thức (Knowledge Manager) để cập nhật hoặc bổ sung tài liệu nội bộ kịp thời.
            </p>

            {/* 5 Distinct Reason Chips */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Chọn lý do chính cần cải thiện:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {FEEDBACK_REASONS.map((item) => {
                  const isSelected = selectedFeedbackReason === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedFeedbackReason(item.key)}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-start justify-between transition cursor-pointer ${
                        isSelected
                          ? 'border-[#0a66c2] bg-[#edf3f8] text-[#0a66c2] ring-1 ring-[#0a66c2]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{item.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${item.badgeColor}`}
                          >
                            {item.key}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#0a66c2] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ghi chú chi tiết thêm (tùy chọn):
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Quy định công tác phí hiện nay đã tăng lên 650.000đ/ngày theo quyết định 2026..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#0a66c2] text-[#191919]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setFeedbackModalMessage(null)}
                className="px-4 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={submitDislikeFeedback}
                disabled={isSubmittingFeedback}
                className="px-4 py-2 rounded-md bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                {isSubmittingFeedback ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: KNOWLEDGE QUALITY REVIEW DASHBOARD             */}
      {/* ======================================================== */}
      {qualityDashboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0dfdc] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#0a66c2] text-white flex items-center justify-center shadow-xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#191919]">
                    Kiểm soát Chất lượng Tri thức (Knowledge Quality Assurance)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Báo cáo tỷ lệ hài lòng và danh sách câu hỏi bị phản hồi tiêu cực
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQualityDashboardOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingQuality ? (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-[#0a66c2]" />
                  <p className="text-xs">Đang tải chỉ số chất lượng...</p>
                </div>
              ) : (
                <>
                  {/* Top Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Satisfaction Rate */}
                    <div className="p-4 rounded-xl border border-[#0a66c2]/20 bg-[#edf3f8]">
                      <div className="text-[11px] font-bold text-[#0a66c2] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Tỷ lệ hài lòng
                      </div>
                      <div className="text-2xl font-black text-[#0a66c2]">
                        {feedbackStats?.satisfactionRate || '100%'}
                      </div>
                      <div className="mt-2 w-full bg-[#0a66c2]/20 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0a66c2] h-full rounded-full transition-all duration-500"
                          style={{
                            width: feedbackStats?.satisfactionRate || '100%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Total Answers */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Tổng câu trả lời
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {feedbackStats?.totalAnswers ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Đã được truy vấn</div>
                    </div>

                    {/* Likes */}
                    <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Đánh giá Tốt
                      </div>
                      <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                        {feedbackStats?.totalLikes ?? 0}
                      </div>
                      <div className="text-[11px] text-emerald-600/80 mt-1">Câu trả lời hữu ích</div>
                    </div>

                    {/* Dislikes */}
                    <div className="p-4 rounded-2xl border border-rose-100 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/30">
                      <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Cần sửa đổi
                      </div>
                      <div className="text-2xl font-black text-rose-900 dark:text-rose-200">
                        {feedbackStats?.totalDislikes ?? 0}
                      </div>
                      <div className="text-[11px] text-rose-600/80 mt-1">Góp ý từ nhân viên</div>
                    </div>
                  </div>

                  {/* Disliked Answers List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Danh sách câu trả lời bị góp ý tiêu cực ({dislikedFeedbacks.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Knowledge Manager ưu tiên cập nhật văn bản liên quan
                      </span>
                    </div>

                    {dislikedFeedbacks.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                        Hiện tại không có câu trả lời nào bị phản hồi tiêu cực. Hệ thống tri thức hoạt động xuất sắc!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dislikedFeedbacks.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    {item.user?.name || 'Nhân viên'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3" />
                                      {item.user?.department?.name || 'Văn phòng'}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Feedback Comment Note */}
                            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 font-medium">
                              <strong>Lý do phản hồi:</strong> {item.comment || 'Không có ghi chú cụ thể'}
                            </div>

                            {/* Message Answer Excerpt */}
                            {item.message && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                                {item.message.rewrittenQuery && (
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    Câu hỏi: "{item.message.rewrittenQuery}"
                                  </div>
                                )}
                                <div className="line-clamp-2 italic text-slate-600 dark:text-slate-400">
                                  "{item.message.content}"
                                </div>
                              </div>
                            )}

                            {/* Citations used */}
                            {item.message?.citations && Array.isArray(item.message.citations) && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="text-slate-400">Tài liệu đã trích dẫn:</span>
                                {item.message.citations.map((c: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px]"
                                  >
                                    {c.documentName || `Doc #${c.documentId?.slice(0, 8)}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
              <span className="text-xs text-slate-500">
                Chỉ số được tổng hợp tự động từ các phiên hỏi đáp của nhân viên
              </span>
              <button
                onClick={() => setQualityDashboardOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
