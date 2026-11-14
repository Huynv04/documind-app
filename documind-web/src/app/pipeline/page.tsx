'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { pipelineApi, ApiError } from '@/lib/api';
import {
  PipelineJobItem,
  PipelineStage,
  JobStatus,
  QueueStats,
  PipelineConfig,
} from '@/types/pipeline';
import { DocumentChunkItem } from '@/types/document';
import {
  Cpu,
  Layers,
  Sparkles,
  FileText,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Database,
  Building2,
  Shield,
  ShieldAlert,
  X,
  Copy,
  Check,
  Activity,
  Terminal,
  Zap,
  CheckCheck,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sliders,
  FileQuestion,
  Info,
} from 'lucide-react';

const DEPARTMENTS = [
  'Tất cả phòng ban',
  'Kỹ thuật & Vận hành',
  'Nhân sự (HR)',
  'Tài chính - Kế toán',
  'Kinh doanh & Marketing',
  'Ban Giám đốc & CNTT',
  'Pháp chế & Tuân thủ',
];

export default function PipelinePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [jobs, setJobs] = useState<PipelineJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Live auto-polling
  const [isAutoPolling, setIsAutoPolling] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chunk Inspector Drawer
  const [inspectingJob, setInspectingJob] = useState<PipelineJobItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Error Stacktrace Modal
  const [errorJob, setErrorJob] = useState<PipelineJobItem | null>(null);
  const [copiedError, setCopiedError] = useState(false);

  // Action states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // 2. Fetch Data
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      try {
        const res = await pipelineApi.getPipelineData({
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          departmentId:
            departmentFilter && departmentFilter !== 'Tất cả phòng ban'
              ? departmentFilter
              : undefined,
        });

        setJobs(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setStats(res.stats);
        setConfig(res.config);
        setLastRefreshedAt(new Date());
      } catch (err) {
        console.error('Failed to fetch pipeline jobs:', err);
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    [page, search, statusFilter, departmentFilter],
  );

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'KNOWLEDGE_MANAGER')) {
      fetchData();
    }
  }, [user, fetchData]);

  // 3. Live Auto-polling every 3.5 seconds
  useEffect(() => {
    if (!isAutoPolling || !user || (user.role !== 'ADMIN' && user.role !== 'KNOWLEDGE_MANAGER')) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(() => {
      fetchData(true);
    }, 3500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isAutoPolling, user, fetchData]);

  // Actions
  const handleRetrySingle = async (job: PipelineJobItem) => {
    setRetryingJobId(job.id);
    try {
      const res = await pipelineApi.retryJob(job.documentId);
      setActionSuccess(res.message || `Đã đưa tài liệu "${job.originalName}" vào lại hàng đợi`);
      fetchData(true);
      if (errorJob && errorJob.id === job.id) {
        setErrorJob(null);
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.messages.join(' | ') : 'Lỗi khi kích hoạt thử lại nạp');
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      const res = await pipelineApi.retryAllFailed();
      setActionSuccess(res.message);
      fetchData(true);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof ApiError ? err.messages.join(' | ') : 'Lỗi khi kích hoạt thử lại tất cả');
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleOpenChunks = async (job: PipelineJobItem) => {
    setInspectingJob(job);
    setIsLoadingChunks(true);
    setChunkSearch('');
    try {
      const res = await pipelineApi.getJobChunks(job.documentId);
      setChunks(res);
    } catch (err) {
      console.error('Failed to get chunks:', err);
      setChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const handleCopyError = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
      return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
    }
    return <FileCode className="w-5 h-5 text-purple-500" />;
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            Đang chạy (ACTIVE)
          </span>
        );
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Đang chờ (WAITING)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Hoàn tất (COMPLETED)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Thất bại (FAILED)
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
            Tạm dừng (DELAYED)
          </span>
        );
      default:
        return null;
    }
  };

  const getStageBadge = (stage: PipelineStage) => {
    switch (stage) {
      case 'STORAGE':
        return {
          label: '1. Storage & Pre-validation',
          badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300',
        };
      case 'PARSER':
        return {
          label: '2. Specialized Parser',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300',
        };
      case 'CHUNKING':
        return {
          label: '3. Table-preserving Chunker',
          badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300',
        };
      case 'EMBEDDING':
        return {
          label: '4. Batch Embedding (OpenAI)',
          badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300',
        };
      case 'PGVECTOR':
        return {
          label: '5. pgvector HNSW Indexing',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300',
        };
      case 'COMPLETED':
        return {
          label: 'Hoàn tất Pipeline (INDEXED)',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300',
        };
      case 'FAILED':
        return {
          label: 'Gặp lỗi tại Worker',
          badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300',
        };
      default:
        return {
          label: stage,
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  // Filter chunks inside Inspector
  const filteredChunks = chunks.filter((c) =>
    c.content.toLowerCase().includes(chunkSearch.toLowerCase()),
  );

  // RBAC Access Denied screen
  if (!isAuthLoading && user && user.role !== 'ADMIN' && user.role !== 'KNOWLEDGE_MANAGER') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6 shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Truy cập bị giới hạn bởi quyền hạn (RBAC Guard)
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm max-w-lg leading-relaxed">
            Khu vực <strong>Trung tâm Giám sát Hàng đợi & Pipeline Ingestion (BullMQ)</strong> chỉ dành riêng cho Quản trị viên (ADMIN) và Quản lý Tri thức (KNOWLEDGE_MANAGER) để quản trị dòng chảy nạp dữ liệu RAG.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Chuyển tới Hỏi đáp Tri thức</span>
            </Link>
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Kho Tài liệu</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              aria-label="Đóng thông báo"
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Tiến trình Xử lý & Đồng bộ Tri thức
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Theo dõi trạng thái tự động hóa theo thời gian thực: Tiếp nhận tài liệu, bóc tách cấu trúc, phân tích ngữ nghĩa AI và lập chỉ mục tìm kiếm thông minh.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Live Auto-polling toggle */}
            <button
              onClick={() => setIsAutoPolling(!isAutoPolling)}
              title={isAutoPolling ? 'Đang bật tự động cập nhật mỗi 3.5s' : 'Đang tắt tự động cập nhật'}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isAutoPolling
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAutoPolling ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`}
              />
              <span>{isAutoPolling ? 'Live Polling (3.5s)' : 'Polling Đã Tắt'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              title="Làm mới dữ liệu ngay"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Làm mới</span>
            </button>

            {/* Retry All Failed Button */}
            {stats && stats.failed > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={isRetryingAll}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
                <span>Thử lại {stats.failed} job lỗi</span>
              </button>
            )}

            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Kho Tài liệu</span>
            </Link>
          </div>
        </div>

        {/* 1. Sơ đồ 5 Giai đoạn Pipeline Trực quan (5-Stage Visualizer Flow) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Quy trình Tự động hóa
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Xử lý ngầm hiệu năng cao
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Dòng chảy Xử lý & Chuẩn hóa Tri thức (5 Giai đoạn)
              </h2>
            </div>

            {config && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Chunk: {config.chunkSize}t</span>
                <span>/</span>
                <span>Overlap: {config.chunkOverlap}t</span>
                <span>/</span>
                <span className="text-emerald-600 dark:text-emerald-400">Batch: {config.batchSize}</span>
                <span>/</span>
                <span>Model: {config.embeddingModel}</span>
              </div>
            )}
          </div>

          {/* 5-Step Progress Flow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col justify-between relative group hover:border-sky-400 transition">
              <div>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs mb-2">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Chặng 1: Storage
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  Lưu trữ & Kiểm tra
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  MinIO / Local blob, kiểm tra MIME và kích thước $\le 20$MB.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-sky-200/60 dark:border-sky-800/40 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                Queue: BullMQ ingestion
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col justify-between relative group hover:border-indigo-400 transition">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs mb-2">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Chặng 2: Parser
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  Bóc tách Chuyên biệt
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  PDF (giữ số trang), DOCX (headings), Markdown (bảo toàn bảng).
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                Preserve Page Mapping
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col justify-between relative group hover:border-purple-400 transition">
              <div>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs mb-2">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Chặng 3: Chunking
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  Bẻ đoạn Ngữ cảnh
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  800 tokens, 100 overlap, bảo toàn nguyên khối bảng biểu Markdown.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-purple-200/60 dark:border-purple-800/40 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                Table-Preserving
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between relative group hover:border-amber-400 transition">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Chặng 4: Embedding
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  Batch Embedding
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  OpenAI text-embedding-3-small (1536 chiều), batching 100 texts/lần.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Batch: 100 chunks / call
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col justify-between relative group hover:border-emerald-400 transition">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Chặng 5: pgvector
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  Lưu trữ & Indexing
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Ghi vào PostgreSQL pgvector, chỉ mục HNSW, Metadata RBAC đầy đủ.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Status: INDEXED
              </div>
            </div>
          </div>
        </section>

        {/* 2. Thống kê Sức khỏe Hàng đợi & Worker Performance */}
        {stats && (
          <div className="space-y-4">
            {/* 5 Queue State KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Active */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Đang chạy (Active)
                  </span>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-2">
                    {stats.active}
                    {stats.active > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping inline-block" />
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              {/* Waiting */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Đang chờ (Waiting)
                  </span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {stats.waiting}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Đã hoàn tất
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.completed}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Failed */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Thất bại (Failed)
                  </span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {stats.failed}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Delayed */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tạm dừng (Delayed)
                  </span>
                  <div className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">
                    {stats.delayed}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Worker Health Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    stats.workerStatus === 'ACTIVE'
                      ? 'bg-emerald-500 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Trạng thái Ingestion Worker:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                        stats.workerStatus === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {stats.workerStatus === 'ACTIVE' ? 'Worker Đang Chạy' : 'Worker Nghỉ (Idle)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Đồng bộ tự động lần cuối: {lastRefreshedAt.toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>
                    Throughput: <strong>{stats.throughputDocsPerMin} docs/phút</strong> (~{stats.throughputChunksPerSec} chunks/s)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>
                    Độ trễ trung bình: <strong>{stats.avgIngestionTimeMs.toLocaleString()} ms</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                  <span>
                    Tỷ lệ thành công: <strong className="text-emerald-600 dark:text-emerald-400">{stats.successRatePercent}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Toolbar & Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 w-full">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tác vụ nạp theo tên tài liệu..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang chạy (ACTIVE)</option>
              <option value="WAITING">Đang chờ (WAITING)</option>
              <option value="COMPLETED">Đã hoàn tất (COMPLETED)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {(search || statusFilter || departmentFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setDepartmentFilter('');
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng số: <strong>{total}</strong> tác vụ
            </span>
          </div>
        </div>

        {/* 4. Ingestion Jobs Explorer Table */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Danh sách Tác vụ nạp Tri thức (BullMQ Jobs Explorer)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Trang {page} / {totalPages || 1}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Tài liệu & Định dạng</th>
                  <th className="py-3 px-4">Phòng ban</th>
                  <th className="py-3 px-4">Tiến trình Pipeline (5 Chặng)</th>
                  <th className="py-3 px-4 text-center">Thử lại (Attempts)</th>
                  <th className="py-3 px-4 text-center">Thời gian</th>
                  <th className="py-3 px-4 text-center">Trạng thái BullMQ</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs font-semibold">Đang tải danh sách tác vụ pipeline...</span>
                      </div>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileQuestion className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Không tìm thấy tác vụ nạp nào
                        </span>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const stageInfo = getStageBadge(job.currentStage);
                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* 1. Document & Format */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                              {getFileIcon(job.mimeType, job.originalName)}
                            </div>
                            <div className="min-w-0 max-w-[220px] sm:max-w-[280px]">
                              <div
                                className="font-semibold text-slate-900 dark:text-white truncate"
                                title={job.originalName}
                              >
                                {job.originalName}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span>{formatBytes(job.sizeBytes)}</span>
                                {job.pageCount && (
                                  <>
                                    <span>•</span>
                                    <span>{job.pageCount} trang</span>
                                  </>
                                )}
                                {job.chunkCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                      {job.chunkCount} chunks
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Department */}
                        <td className="py-3.5 px-4 text-xs">
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {job.departmentName || 'Chung toàn công ty'}
                            </span>
                          </span>
                        </td>

                        {/* 3. Pipeline Progress 5 Stages */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 min-w-[180px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageInfo.badge}`}
                              >
                                {stageInfo.label}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 font-bold">
                                {job.progressPercent}%
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  job.status === 'FAILED'
                                    ? 'bg-rose-500'
                                    : job.status === 'COMPLETED'
                                    ? 'bg-emerald-500'
                                    : 'bg-indigo-600 animate-pulse'
                                }`}
                                style={{ width: `${job.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Attempts */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                              job.attempts > 1
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {job.attempts} / {job.maxAttempts}
                          </span>
                        </td>

                        {/* 5. Duration */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                          {job.durationMs >= 1000
                            ? `${(job.durationMs / 1000).toFixed(1)}s`
                            : `${job.durationMs}ms`}
                        </td>

                        {/* 6. Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(job.status)}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Chunks Inspector Trigger */}
                            <button
                              onClick={() => handleOpenChunks(job)}
                              title="Soi danh sách Chunks đã bẻ"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>

                            {/* View Error Modal Trigger if failed */}
                            {job.status === 'FAILED' && (
                              <button
                                onClick={() => setErrorJob(job)}
                                title="Xem chi tiết Exception & Stacktrace"
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Retry Single Job */}
                            <button
                              onClick={() => handleRetrySingle(job)}
                              disabled={retryingJobId === job.id}
                              title="Kích hoạt thử lại vào hàng đợi BullMQ"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            >
                              <RotateCw
                                className={`w-3.5 h-3.5 ${
                                  retryingJobId === job.id ? 'animate-spin text-indigo-600' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị {jobs.length} / {total} tác vụ
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 5. Error Stacktrace Modal */}
        {errorJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Chi tiết Lỗi Worker (BullMQ Exception)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                      {errorJob.originalName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setErrorJob(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Thông báo lỗi ghi nhận:</span>
                  <button
                    onClick={() => handleCopyError(errorJob.errorMessage || 'Lỗi không xác định')}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedError ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép lỗi</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 text-rose-400 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto border border-rose-950/40">
                  {errorJob.errorMessage || 'Unknown Worker Ingestion Error: Connection timeout during batch embedding API call.'}
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>
                  • Số lần đã thử lại: <strong>{errorJob.attempts} / {errorJob.maxAttempts}</strong>
                </div>
                <div>
                  • Giai đoạn lỗi: <strong>{errorJob.currentStage}</strong>
                </div>
                <div>
                  • Cơ chế Backoff: <strong>Exponential Backoff (2.0s initial delay)</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setErrorJob(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleRetrySingle(errorJob)}
                  disabled={retryingJobId === errorJob.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${
                      retryingJobId === errorJob.id ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Thử lại nạp ngầm ngay</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Chunk Inspector Drawer */}
        {inspectingJob && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 max-w-xs sm:max-w-md">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      Soi Vector Chunks: {inspectingJob.originalName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tổng số: <strong>{chunks.length}</strong> chunks đã bẻ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingJob(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* In-chunk search */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm nội dung bên trong các chunks..."
                    value={chunkSearch}
                    onChange={(e) => setChunkSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {chunkSearch && (
                    <button
                      onClick={() => setChunkSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chunk list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingChunks ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">Đang tải danh sách vector chunks...</span>
                  </div>
                ) : filteredChunks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {chunks.length === 0
                      ? 'Tài liệu chưa có vector chunk nào (đang trong quá trình nạp hoặc đã bị hủy).'
                      : 'Không tìm thấy chunk nào khớp với từ khóa tìm kiếm.'}
                  </div>
                ) : (
                  filteredChunks.map((chunk, idx) => (
                    <div
                      key={chunk.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            Chunk #{chunk.chunkIndex ?? idx + 1}
                          </span>
                          {chunk.pageNumber && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-[10px] font-semibold">
                              Trang {chunk.pageNumber}
                            </span>
                          )}
                          {chunk.tokenCount && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-semibold">
                              {chunk.tokenCount} tokens
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                          title="Sao chép nội dung chunk"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {copiedChunkId === chunk.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 text-[10px] font-bold">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {chunk.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Hiển thị {filteredChunks.length} / {chunks.length} chunks
                </span>
                <button
                  onClick={() => setInspectingJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  Đóng ngăn kéo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

