'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { documentApi, ApiError } from '@/lib/api';
import {
  DocumentItem,
  DocumentStatus,
  SensitivityLevel,
  DocumentChunkItem,
} from '@/types/document';
import { UserRole } from '@/types/auth';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  Download,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Copy,
  Check,
  Activity,
  AlertCircle,
  Database,
  Building2,
  Tag,
  Shield,
  FileQuestion,
  ExternalLink,
  Cpu,
} from 'lucide-react';

const DEPARTMENTS = [
  'Tất cả phòng ban (Chung toàn công ty)',
  'Kỹ thuật & Vận hành',
  'Nhân sự (HR)',
  'Tài chính - Kế toán',
  'Kinh doanh & Marketing',
  'Ban Giám đốc & CNTT',
  'Pháp chế & Tuân thủ',
];

/**
 * Kiểm tra tệp tin có phải là UTF-8 hợp lệ không (tối giản, chuẩn xác nhất)
 */
async function isUtf8File(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.includes(0x00)) return false; // UTF-16 và nhị phân luôn chứa byte null 0x00
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true; // Giải mã UTF-8 nghiêm ngặt thành công
  } catch {
    return false; // Ném lỗi nếu gặp UTF-16 BE, LE, UTF-32 hoặc byte không hợp lệ
  }
}

export default function DocumentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Documents list state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sensitivityFilter, setSensitivityFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Upload modal & state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('INTERNAL');
  const [department, setDepartment] = useState('Tất cả phòng ban (Chung toàn công ty)');
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>([
    'EMPLOYEE',
    'KNOWLEDGE_MANAGER',
    'ADMIN',
  ]);
  const [tagsInput, setTagsInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chunk Inspector Modal state (Module 3 Feature)
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Error Detail Modal state
  const [errorDetailDoc, setErrorDetailDoc] = useState<DocumentItem | null>(null);

  // Derived state: Live auto-polling active when any document is in background pipeline
  const isLivePolling = documents.some(
    (d) => d.status === 'PROCESSING' || d.status === 'UPLOADING',
  );

  // Auth Guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Reusable refresh handler
  const refreshList = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingDocs(true);
      try {
        const res = await documentApi.list({
          page,
          limit: 10,
          search: search || undefined,
          status: (statusFilter as DocumentStatus) || undefined,
          sensitivity: (sensitivityFilter as SensitivityLevel) || undefined,
          departmentId:
            departmentFilter && departmentFilter !== 'Tất cả phòng ban (Chung toàn công ty)'
              ? departmentFilter
              : undefined,
        });
        setDocuments(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
      } catch (err: unknown) {
        console.error('Failed to fetch documents:', err);
      } finally {
        if (!silent) setIsLoadingDocs(false);
      }
    },
    [page, search, statusFilter, sensitivityFilter, departmentFilter],
  );

  // Initial and reactive fetch when filters change
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadData = async () => {
      setIsLoadingDocs(true);
      try {
        const res = await documentApi.list({
          page,
          limit: 10,
          search: search || undefined,
          status: (statusFilter as DocumentStatus) || undefined,
          sensitivity: (sensitivityFilter as SensitivityLevel) || undefined,
          departmentId:
            departmentFilter && departmentFilter !== 'Tất cả phòng ban (Chung toàn công ty)'
              ? departmentFilter
              : undefined,
        });
        if (!isCancelled) {
          setDocuments(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Failed to load documents:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDocs(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, page, search, statusFilter, sensitivityFilter, departmentFilter]);

  // Auto-polling effect (runs every 3.5s silently while documents are in background pipeline)
  useEffect(() => {
    if (!isLivePolling) return;

    const interval = setInterval(() => {
      refreshList(true);
    }, 3500);

    return () => {
      clearInterval(interval);
    };
  }, [isLivePolling, refreshList]);

  // Open Chunk Inspector
  const handleInspectChunks = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    setChunkSearch('');
    setIsLoadingChunks(true);
    try {
      const data = await documentApi.getChunks(doc.id);
      setChunks(data);
    } catch {
      setChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Copy chunk text
  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // Retry ingestion for a failed document (BullMQ re-queue)
  const handleRetryIngestion = async (doc: DocumentItem) => {
    setIsRetryingId(doc.id);
    try {
      const res = await documentApi.retry(doc.id);
      setActionSuccess(res.message);
      refreshList(true);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof ApiError
          ? err.messages.join(' | ')
          : 'Lỗi khi kích hoạt thử lại nạp tệp';
      setActionError(errorMsg);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setIsRetryingId(null);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    const validExtensions = /\.(pdf|docx|doc|md|txt)$/i;
    if (!validExtensions.test(file.name)) {
      const msg = `Định dạng tệp "${file.name}" không được hỗ trợ. Hệ thống chỉ chấp nhận: PDF (text-based), Word (.docx, .doc), Markdown (.md), Text (.txt).`;
      setActionError(msg);
      setUploadError(msg);
      setTimeout(() => setActionError(null), 7000);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const msg = `Dung lượng tệp "${file.name}" (${sizeMB} MB) vượt quá giới hạn tối đa 20MB. Vui lòng nén hoặc chia nhỏ tệp tin.`;
      setActionError(msg);
      setUploadError(msg);
      setTimeout(() => setActionError(null), 7000);
      return;
    }

    // Kiểm tra bảng mã UTF-8 đối với tệp văn bản (TXT, Markdown)
    if (/\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith('text/')) {
      const isValidUtf8 = await isUtf8File(file);
      if (!isValidUtf8) {
        const msg = `Tệp văn bản "${file.name}" không đúng chuẩn UTF-8 (phát hiện bảng mã UTF-16 hoặc không hợp lệ). Hệ thống chỉ chấp nhận bảng mã UTF-8 để bảo toàn ký tự tiếng Việt.`;
        setActionError(msg);
        setUploadError(msg);
        setSelectedFile(null);
        setTimeout(() => setActionError(null), 7000);
        return;
      }
    }

    setSelectedFile(file);
    setUploadError(null);
    setActionError(null);
    setIsUploadOpen(true);
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    // Kiểm tra bảo vệ bổ sung trước khi đẩy lên Backend
    if (/\.(txt|md|markdown)$/i.test(selectedFile.name) || selectedFile.type.startsWith('text/')) {
      const isValidUtf8 = await isUtf8File(selectedFile);
      if (!isValidUtf8) {
        const msg = `Tệp văn bản "${selectedFile.name}" không đúng chuẩn UTF-8 (phát hiện bảng mã UTF-16 hoặc không hợp lệ). Hệ thống chỉ chấp nhận bảng mã UTF-8 để bảo toàn ký tự tiếng Việt.`;
        setUploadError(msg);
        setActionError(msg);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sensitivity', sensitivity);
    formData.append('allowedRoles', JSON.stringify(allowedRoles));

    if (department && department !== 'Tất cả phòng ban (Chung toàn công ty)') {
      formData.append('departmentId', department);
    }

    if (tagsInput.trim()) {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      formData.append('tags', JSON.stringify(tags));
    }

    try {
      await documentApi.upload(formData, (progress) => {
        setUploadProgress(progress);
      });

      setActionSuccess(`Đã đẩy tệp "${selectedFile.name}" vào hàng đợi Ingestion (BullMQ)!`);
      setSelectedFile(null);
      setTagsInput('');
      setIsUploadOpen(false);
      refreshList();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.messages.join(' | ')
          : 'Không thể tải lên tệp tin. Vui lòng thử lại sau.';
      setUploadError(msg);
      setActionError(msg);
      setTimeout(() => setActionError(null), 7000);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Download
  const handleDownload = async (doc: DocumentItem) => {
    try {
      await documentApi.download(doc.id, doc.originalName);
    } catch {
      setActionError('Không thể tải xuống tệp tin. Vui lòng kiểm tra lại quyền truy cập của tài khoản.');
      setTimeout(() => setActionError(null), 6000);
    }
  };

  // Delete
  const confirmDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);

    try {
      await documentApi.delete(deletingDoc.id);
      setActionSuccess(`Đã xóa vĩnh viễn tài liệu "${deletingDoc.originalName}" và dọn dẹp vector chunks`);
      setDeletingDoc(null);
      refreshList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.messages.join(' | ') : 'Lỗi khi xóa tài liệu.';
      setActionError(msg);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary Metrics
  const indexedCount = documents.filter((d) => d.status === 'INDEXED').length;
  const processingCount = documents.filter((d) => d.status === 'PROCESSING' || d.status === 'UPLOADING').length;
  const failedCount = documents.filter((d) => d.status === 'FAILED').length;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
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

  const getStatusBadge = (doc: DocumentItem) => {
    switch (doc.status) {
      case 'INDEXED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã lập chỉ mục
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            Đang nạp ngầm...
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Đang tải lên
          </span>
        );
      case 'FAILED':
        return (
          <button
            onClick={() => setErrorDetailDoc(doc)}
            title={doc.errorMessage || 'Nhấn để xem chi tiết lỗi'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Thất bại (Xem lỗi)</span>
          </button>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Đã lưu trữ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 font-mono">
            {doc.status}
          </span>
        );
    }
  };

  const getSensitivityBadge = (sens: SensitivityLevel) => {
    switch (sens) {
      case 'CONFIDENTIAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 uppercase tracking-wider">
            CONFIDENTIAL
          </span>
        );
      case 'PUBLIC':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
            PUBLIC
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
            INTERNAL
          </span>
        );
    }
  };

  const canUploadOrDelete =
    user?.role === 'ADMIN' || user?.role === 'KNOWLEDGE_MANAGER';

  // Filter chunks in inspector
  const filteredChunks = chunks.filter((c) =>
    c.content.toLowerCase().includes(chunkSearch.toLowerCase()),
  );

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Action Success Alert */}
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

        {/* Action Error Alert */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              aria-label="Đóng thông báo lỗi"
              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header with Live Polling Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Kho Tài liệu Tri thức
              </h1>
              {isLivePolling && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Đang đồng bộ tự động...
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý tài liệu và theo dõi tiến trình bóc tách văn bản, phân đoạn ngữ nghĩa và lập chỉ mục tìm kiếm thông minh.
            </p>
          </div>

          {canUploadOrDelete && (
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-semibold text-xs shadow-sm transition cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Tiến trình Xử lý</span>
              </Link>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadError(null);
                  setIsUploadOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Plus className="w-4 h-4" />
                <span>Tải lên tài liệu mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Pipeline Queue Metrics Cards (Module 3 Feature) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tổng tài liệu
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Đã lập chỉ mục
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {indexedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-4 shadow-sm flex items-center justify-between transition ${processingCount > 0
              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                Đang xử lý ngầm
                {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {processingCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Activity className={`w-5 h-5 ${processingCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-4 shadow-sm flex items-center justify-between transition ${failedCount > 0
              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Thất bại
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {failedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        {canUploadOrDelete && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
              : 'border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-400 shadow-sm'
              }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  await handleFileSelected(e.target.files[0]);
                }
              }}
              className="hidden"
              accept=".pdf,.docx,.doc,.md,.txt"
            />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Kéo thả tệp tài liệu vào đây hoặc{' '}
              <span className="text-indigo-600 dark:text-indigo-400 underline">
                duyệt tệp từ máy tính
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Hỗ trợ: PDF (text-based), Word (.docx, .doc), Markdown (.md), Text (.txt) • Dung lượng tối đa: 20MB
            </p>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên tài liệu..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="INDEXED">Đã lập chỉ mục (INDEXED)</option>
              <option value="PROCESSING">Đang nạp ngầm (PROCESSING)</option>
              <option value="UPLOADING">Đang tải lên (UPLOADING)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            {/* Sensitivity Filter */}
            <select
              value={sensitivityFilter}
              onChange={(e) => setSensitivityFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              <option value="">Mọi cấp độ nhạy cảm</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <button
              onClick={() => refreshList()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDocs ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Document Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-3.5 px-4">Tên tài liệu</th>
                  <th className="py-3.5 px-4">Trạng thái Pipeline</th>
                  <th className="py-3.5 px-4">Dung lượng</th>
                  <th className="py-3.5 px-4">Phân quyền (RBAC)</th>
                  <th className="py-3.5 px-4">Phòng ban</th>
                  <th className="py-3.5 px-4">Chunks (pgvector)</th>
                  <th className="py-3.5 px-4">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingDocs ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-7 h-7 mx-auto animate-spin mb-2 text-indigo-600" />
                      <span>Đang tải danh sách tài liệu...</span>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Chưa có tài liệu nào
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {canUploadOrDelete
                          ? 'Hãy kéo thả hoặc tải lên tệp tin đầu tiên để bắt đầu'
                          : 'Hiện chưa có tài liệu nào được phân quyền cho bạn'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Name & Type */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                            {getFileIcon(doc.mimeType, doc.originalName)}
                          </div>
                          <div className="overflow-hidden">
                            <span
                              title={doc.originalName}
                              className="font-bold text-slate-900 dark:text-white truncate block text-xs"
                            >
                              {doc.originalName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {getSensitivityBadge(doc.sensitivity)}
                              {doc.pageCount && <span>{doc.pageCount} trang</span>}
                            </div>
                            {doc.status === 'FAILED' && doc.errorMessage && (
                              <button
                                onClick={() => setErrorDetailDoc(doc)}
                                className="text-[10px] text-rose-500 hover:underline truncate mt-0.5 text-left block"
                              >
                                Lỗi: {doc.errorMessage}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(doc)}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatBytes(doc.sizeBytes)}
                      </td>

                      {/* RBAC */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {doc.allowedRoles.map((role) => (
                            <span
                              key={role}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              {role === 'KNOWLEDGE_MANAGER' ? 'KM' : role}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        {doc.department?.name || 'Chung công ty'}
                      </td>

                      {/* Chunks */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                          title="Bấm để soi chi tiết từng Chunks và vector"
                          aria-label={`Soi Chunks của tài liệu ${doc.originalName}`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{doc._count?.chunks || 0} chunks</span>
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Retry button for FAILED status */}
                          {doc.status === 'FAILED' && canUploadOrDelete && (
                            <button
                              onClick={() => handleRetryIngestion(doc)}
                              disabled={isRetryingId === doc.id}
                              title="Thử lại quy trình nạp ngầm (BullMQ)"
                              aria-label="Thử lại nạp ngầm"
                              className="inline-flex items-center gap-1 py-1 px-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              <RotateCw
                                className={`w-3.5 h-3.5 ${isRetryingId === doc.id ? 'animate-spin' : ''
                                  }`}
                              />
                              <span>Thử lại</span>
                            </button>
                          )}

                          {/* Download button */}
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Tải xuống tệp gốc"
                            aria-label="Tải xuống tệp gốc"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          {canUploadOrDelete && (
                            <button
                              onClick={() => setDeletingDoc(doc)}
                              title="Xóa tài liệu khỏi hệ thống"
                              aria-label="Xóa tài liệu"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
              <div>
                Hiển thị trang <strong className="font-semibold text-slate-800 dark:text-slate-200">{page}</strong> / {totalPages} (Tổng số: {total} tài liệu)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Trang trước"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Trang tiếp theo"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 2. CHUNK INSPECTOR MODAL (MODULE 3 FEATURE)               */}
      {/* ======================================================== */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Trình Soi Chunks & Vector (pgvector)
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-xl">
                  {inspectDoc.originalName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng số: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{chunks.length} chunks</span> đã bóc tách và tạo vector nhúng 1536 chiều
                </p>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                aria-label="Đóng cửa sổ soi chunk"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chunk Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chunkSearch}
                  onChange={(e) => setChunkSearch(e.target.value)}
                  placeholder="Tìm kiếm nội dung bên trong các Chunks..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Chunk List Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoadingChunks ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Đang tải danh sách Chunks từ PostgreSQL...</span>
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    {chunks.length === 0
                      ? 'Chưa có chunks nào được lưu cho tài liệu này'
                      : 'Không tìm thấy chunk nào khớp với từ khóa tìm kiếm'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {chunks.length === 0
                      ? 'Tài liệu đang trong hàng đợi xử lý hoặc đã thất bại khi bóc tách.'
                      : 'Hãy thử tìm kiếm với cụm từ khác.'}
                  </p>
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        {chunk.pageNumber && (
                          <span className="text-slate-500 font-medium">
                            Trang {chunk.pageNumber}
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px] font-mono">
                          ~{chunk.tokenCount} tokens
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer text-xs"
                        aria-label="Sao chép nội dung đoạn chunk"
                      >
                        {copiedChunkId === chunk.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold text-[11px]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {chunk.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/30">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. UPLOAD MODAL DRAWER                                   */}
      {/* ======================================================== */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                if (!isUploading) setIsUploadOpen(false);
              }}
              aria-label="Đóng bảng tải lên"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">
              Cấu hình & Nạp Tài liệu Tri thức
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Tệp tin sẽ được lưu trữ bền vững trên MinIO/S3 và đưa vào luồng bóc tách tự động (BullMQ Ingestion Queue).
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File selector preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Tệp tin đã chọn
                </label>
                {selectedFile ? (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer font-semibold"
                    >
                      Đổi tệp
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    required
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        await handleFileSelected(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.docx,.doc,.md,.txt"
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                )}
              </div>

              {/* Department Assignment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phòng ban áp dụng (Department Assignment)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sensitivity Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Cấp độ Bảo mật (Sensitivity)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL'] as SensitivityLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSensitivity(level)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${sensitivity === level
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Roles */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phân quyền vai trò được phép hỏi đáp (RBAC)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['EMPLOYEE', 'KNOWLEDGE_MANAGER', 'ADMIN'] as UserRole[]).map((role) => {
                    const isChecked = allowedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            if (allowedRoles.length > 1) {
                              setAllowedRoles(allowedRoles.filter((r) => r !== role));
                            }
                          } else {
                            setAllowedRoles([...allowedRoles, role]);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${isChecked
                          ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Thẻ Tags phân loại (ngăn cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="HR, ChinhSach, QuyTrinh2026..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Đang tải tệp lên MinIO/S3...</span>
                    <span className="font-mono font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Đang tải lên...' : 'Tải lên & Nạp hàng đợi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: DELETE DOCUMENT CONFIRMATION                   */}
      {/* ======================================================== */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Xóa vĩnh viễn tài liệu?
                </h3>
                <p className="text-xs text-slate-500">
                  Hành động này sẽ dọn dẹp toàn bộ dữ liệu liên quan
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa tệp{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{deletingDoc.originalName}"
              </strong>{' '}
              khỏi kho tri thức không? Tệp gốc trên MinIO/S3 và toàn bộ{' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {deletingDoc._count?.chunks || 0} vector chunks
              </span>{' '}
              trong PostgreSQL sẽ bị xóa để tránh AI suy diễn sai lệch.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteDocument}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: INGESTION ERROR DETAIL MODAL                   */}
      {/* ======================================================== */}
      {errorDetailDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Chi tiết lỗi nạp tài liệu</span>
              </div>
              <button
                onClick={() => setErrorDetailDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 font-mono leading-relaxed max-h-48 overflow-y-auto">
              {errorDetailDoc.errorMessage || 'Không có mô tả chi tiết lỗi từ Worker.'}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có thể kiểm tra lại định dạng tệp (không bị khóa mật khẩu, text-based) và kích hoạt nút Thử lại để đưa task vào hàng đợi BullMQ.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setErrorDetailDoc(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const target = errorDetailDoc;
                  setErrorDetailDoc(null);
                  handleRetryIngestion(target);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Thử lại nạp ngầm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
