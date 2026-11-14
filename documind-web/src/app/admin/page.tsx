'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { adminApi } from '@/lib/api';
import { SystemOverview, AuditLogItem, AuditLogsResponse } from '@/types/admin';
import {
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Coins,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  X,
  Code,
  DollarSign,
  Layers,
  Database,
  Building2,
} from 'lucide-react';

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation tab: 'overview' | 'audit'
  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');

  // Overview data state
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditMeta, setAuditMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal payload viewer
  const [selectedLogPayload, setSelectedLogPayload] = useState<AuditLogItem | null>(null);

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 2. Fetch overview on mount
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadOverview();
    }
  }, [user]);

  // 3. Fetch audit logs when tab changes or filters change
  useEffect(() => {
    if (user && user.role === 'ADMIN' && activeTab === 'audit') {
      loadAuditLogs(currentPage, actionFilter, searchQuery);
    }
  }, [user, activeTab, currentPage, actionFilter]);

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await adminApi.getOverview();
      setOverview(data);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadAuditLogs = async (page: number, action?: string, search?: string) => {
    setIsLoadingAudit(true);
    try {
      const res = await adminApi.getAuditLogs({
        page,
        limit: 15,
        action: action || undefined,
        search: search || undefined,
      });
      setAuditLogs(res.items);
      setAuditMeta(res.meta);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadAuditLogs(1, actionFilter, searchQuery);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActionFilter('');
    setCurrentPage(1);
    loadAuditLogs(1, '', '');
  };

  // Helper render Action Badge
  const renderActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'QUERY':
      case 'STREAM_QUERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <MessageSquare className="w-3 h-3 text-sky-600" />
            {action}
          </span>
        );
      case 'UPLOAD_DOCUMENT':
      case 'UPLOAD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <UploadCloud className="w-3 h-3 text-emerald-600" />
            {action}
          </span>
        );
      case 'DELETE_DOCUMENT':
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Trash2 className="w-3 h-3 text-rose-600" />
            {action}
          </span>
        );
      case 'FEEDBACK_LIKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ThumbsUp className="w-3 h-3 text-indigo-600" />
            {action}
          </span>
        );
      case 'FEEDBACK_DISLIKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <ThumbsDown className="w-3 h-3 text-amber-600" />
            {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
            {action}
          </span>
        );
    }
  };

  // If loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang xác thực quyền Admin...</p>
        </div>
      </div>
    );
  }

  // ACCESS DENIED VIEW: If user is not an Admin
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Từ chối truy cập (Access Denied)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn hiện đang đăng nhập với vai trò{' '}
              <strong className="text-slate-800 dark:text-slate-200">{user.role}</strong>.
              Trang Quản trị Hệ thống và Nhật ký Kiểm toán chỉ dành riêng cho tài khoản có vai trò{' '}
              <strong className="text-rose-600">ADMIN</strong> theo chính sách bảo mật RBAC.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/chat"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Đến khung Hỏi đáp Tri thức
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Về Trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ======================================================== */}
        {/* 1. TOP HEADER & WORKSPACE TITLE                          */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                System Admin Console
              </span>
              <span className="text-xs text-slate-400 font-mono">
                API v1 • PostgreSQL pgvector
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trung tâm Quản trị Hệ thống & LLMOps
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Giám sát tài nguyên, số lượng người dùng, tài liệu, chi phí token OpenAI và nhật ký kiểm toán an toàn thông tin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'overview') loadOverview();
                else loadAuditLogs(currentPage, actionFilter, searchQuery);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Làm mới dữ liệu từ máy chủ"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingOverview || isLoadingAudit ? 'animate-spin text-indigo-600' : ''
                }`}
              />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. TABBED NAVIGATION (OVERVIEW vs AUDIT LOGS)             */}
        {/* ======================================================== */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Chỉ số & Chi phí LLMOps</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Nhật ký Kiểm toán (Audit Logs)</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 3. TAB 1: OVERVIEW & LLMOPS COST METRICS                 */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {isLoadingOverview ? (
              <div className="py-24 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-indigo-600" />
                <p className="text-xs">Đang tổng hợp các chỉ số hệ thống...</p>
              </div>
            ) : overview ? (
              <>
                {/* 4 Hero KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Users */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Người dùng hệ thống
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {overview.users.total}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{overview.users.active} đang hoạt động</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Employee: {overview.users.breakdownByRole.EMPLOYEE}</span>
                      <span>KM: {overview.users.breakdownByRole.KNOWLEDGE_MANAGER}</span>
                      <span>Admin: {overview.users.breakdownByRole.ADMIN}</span>
                    </div>
                  </div>

                  {/* Card 2: Documents */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Kho tài liệu nội bộ
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {overview.documents.total}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                        <span>Đã index:</span>
                        <strong className="text-emerald-600 font-bold">
                          {overview.documents.indexed} tệp
                        </strong>
                        <span>• {overview.documents.storage.formatted}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Chunks: {overview.documents.chunks.total.toLocaleString()}</span>
                      <span className="text-rose-500 font-semibold">
                        Lỗi: {overview.documents.failed}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Chat RAG Operations */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Tương tác hỏi đáp RAG
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {overview.chat.totalMessages}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                        <span>Độ trễ TB:</span>
                        <strong className="text-purple-600 font-bold">
                          {overview.chat.avgLatencyMs}ms
                        </strong>
                        <span>• {overview.chat.totalSessions} phiên</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Hài lòng: {overview.chat.feedback.satisfactionRate}</span>
                      <span>👍 {overview.chat.feedback.likes} / 👎 {overview.chat.feedback.dislikes}</span>
                    </div>
                  </div>

                  {/* Card 4: Tokens & Cost Estimate */}
                  <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Chi phí AI ước tính
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                        <Coins className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-amber-950 dark:text-amber-100">
                        {overview.tokens.costEstimate.formattedVnd}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-800 dark:text-amber-300 font-medium">
                        <span>Tương đương:</span>
                        <strong className="font-mono">
                          {overview.tokens.costEstimate.formattedUsd}
                        </strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-400 flex items-center justify-between font-mono">
                      <span>{overview.tokens.grandTotalTokens.toLocaleString()} tokens</span>
                      <span>1M tokens ≈ $0.20</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Token & Cost Breakdown */}
                  <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Bóc tách Chi phí Mô hình AI (OpenAI API)
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Tỷ giá: 1 USD = 25.400 ₫
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Chat model breakdown */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Chat & Suy luận ({overview.tokens.costEstimate.chatModel})
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            ${overview.tokens.costEstimate.chatCostUsd.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Token tiêu thụ: {overview.tokens.chatTokens.toLocaleString()}</span>
                          <span>Định mức: ~$0.25 / 1M tokens</span>
                        </div>
                      </div>

                      {/* Embedding model breakdown */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              Vector Embeddings ({overview.tokens.costEstimate.embeddingModel})
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${overview.tokens.costEstimate.embeddingCostUsd.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Token nhúng: {overview.tokens.embeddingTokens.toLocaleString()}</span>
                          <span>Định mức: $0.02 / 1M tokens</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Toàn bộ chi phí được tính toán tự động dựa trên số lượng token thực tế được lưu vết trong cơ sở dữ liệu sau mỗi lượt gọi API.
                      </p>
                    </div>
                  </div>

                  {/* Right: Infrastructure & Storage Health */}
                  <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                          <Database className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Trạng thái Hạ tầng & Dữ liệu
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Online
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Cơ sở dữ liệu Vector:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          PostgreSQL 16 + pgvector (Chỉ mục HNSW Cosine)
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Lưu trữ Tệp gốc:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          MinIO / AWS S3 Object Storage ({overview.documents.storage.formatted})
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Hàng đợi Nạp ngầm:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          BullMQ + Redis (Worker concurrency: 2)
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Cơ chế Tìm kiếm:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Hybrid Search (Vector Cosine + FTS tsvector + RRF k=60)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. TAB 2: AUDIT LOGS EXPLORER                            */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo từ khóa câu hỏi, địa chỉ IP, hành động..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Tìm
                </button>
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Tất cả hành động</option>
                  <option value="QUERY">QUERY</option>
                  <option value="STREAM_QUERY">STREAM_QUERY</option>
                  <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
                  <option value="DELETE_DOCUMENT">DELETE_DOCUMENT</option>
                  <option value="FEEDBACK_LIKE">FEEDBACK_LIKE</option>
                  <option value="FEEDBACK_DISLIKE">FEEDBACK_DISLIKE</option>
                </select>

                {(searchQuery || actionFilter) && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Người thực hiện</th>
                      <th className="py-3 px-4">Hành động</th>
                      <th className="py-3 px-4">Tài nguyên</th>
                      <th className="py-3 px-4">IP & Thiết bị</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingAudit ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-600" />
                          <span>Đang tải nhật ký kiểm toán...</span>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Không tìm thấy nhật ký kiểm toán nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>

                          {/* User */}
                          <td className="py-3 px-4">
                            {log.user ? (
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {log.user.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                  <span>{log.user.email}</span>
                                  {log.user.department?.name && (
                                    <span>• {log.user.department.name}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Hệ thống / Vô danh</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {renderActionBadge(log.action)}
                          </td>

                          {/* Resource */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {log.resourceType || 'N/A'}
                            </div>
                            {log.resourceId && (
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                                ID: {log.resourceId}
                              </div>
                            )}
                          </td>

                          {/* IP & User Agent */}
                          <td className="py-3 px-4 text-[11px]">
                            <div className="font-mono text-slate-600 dark:text-slate-300">
                              {log.ipAddress || '127.0.0.1'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {log.userAgent || 'Trình duyệt'}
                            </div>
                          </td>

                          {/* View Metadata Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedLogPayload(log)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Xem payload
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                <span>
                  Hiển thị {auditLogs.length} trên tổng số {auditMeta.total} bản ghi (Trang {auditMeta.page} / {auditMeta.totalPages})
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoadingAudit}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(auditMeta.totalPages, p + 1))}
                    disabled={currentPage >= auditMeta.totalPages || isLoadingAudit}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 5. MODAL: AUDIT LOG PAYLOAD / METADATA VIEWER            */}
      {/* ======================================================== */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chi tiết Payload Nhật ký Kiểm toán
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Hành động:</span>{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {selectedLogPayload.action}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Tài nguyên:</span>{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {selectedLogPayload.resourceType || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">IP:</span>{' '}
                  <span className="font-mono">{selectedLogPayload.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Thời gian:</span>{' '}
                  <span>{new Date(selectedLogPayload.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Dữ liệu Metadata JSON:
                </label>
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {JSON.stringify(selectedLogPayload.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLogPayload(null)}
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

