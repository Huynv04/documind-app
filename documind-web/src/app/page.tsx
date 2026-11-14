'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { documentApi, chatApi } from '@/lib/api';
import { DocumentItem } from '@/types/document';
import { ChatSession } from '@/types/chat';
import {
  MessageSquare,
  FileText,
  UploadCloud,
  CheckCircle2,
  Shield,
  Clock,
  Bookmark,
  Share2,
  Building2,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'>('ALL');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadRealData() {
      setIsDataLoading(true);
      try {
        const [docsRes, sessionsRes] = await Promise.allSettled([
          documentApi.list({ limit: 10 }),
          chatApi.getSessions(),
        ]);

        if (!isMounted) return;

        if (docsRes.status === 'fulfilled' && docsRes.value) {
          setDocuments(docsRes.value.items || []);
          setTotalDocs(docsRes.value.total || 0);
        } else {
          setDocuments([]);
          setTotalDocs(0);
        }

        if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
          setSessions(sessionsRes.value);
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu trang chủ:', err);
        if (isMounted) {
          setDocuments([]);
          setTotalDocs(0);
          setSessions([]);
        }
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f2ee] text-[#191919]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0a66c2] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang tải không gian làm việc...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Quản trị viên Hệ thống',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'KNOWLEDGE_MANAGER':
        return {
          label: 'Quản lý Tri thức (KM)',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      default:
        return {
          label: 'Nhân viên Doanh nghiệp',
          color: 'bg-[#edf3f8] text-[#0a66c2] border-[#0a66c2]/20',
        };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  const filteredDocs =
    activeTab === 'ALL'
      ? documents
      : documents.filter((doc) => doc.sensitivity === activeTab);

  const getSensitivityBadge = (level: string) => {
    switch (level) {
      case 'PUBLIC':
        return { label: 'Công khai', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CONFIDENTIAL':
        return { label: 'Bảo mật cao', class: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'Nội bộ', class: 'bg-[#edf3f8] text-[#0a66c2] border-[#0a66c2]/20' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INDEXED':
        return { label: 'Đã lập chỉ mục', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'PROCESSING':
        return { label: 'Đang xử lý', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'FAILED':
        return { label: 'Lỗi bóc tách', class: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, class: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#191919] flex flex-col font-sans">
      <Navbar />

      {/* Main 3-Column LinkedIn Feed Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* ========================================================= */}
          {/* CỘT TRÁI (LEFT RAIL - 3 Cols): Profile & Quick Navigation */}
          {/* ========================================================= */}
          <aside className="md:col-span-3 space-y-3">
            {/* User Profile Card */}
            <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              {/* Cover Banner */}
              <div className="h-16 bg-[#0a66c2] relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a66c2] to-[#004182] opacity-90" />
              </div>

              {/* Avatar & User Details */}
              <div className="px-4 pb-4 text-center relative -mt-8">
                <div className="w-16 h-16 rounded-full bg-white p-1 mx-auto shadow-sm inline-block">
                  <div className="w-full h-full rounded-full bg-[#0a66c2] text-white font-bold flex items-center justify-center text-base uppercase">
                    {(user.name || user.email).slice(0, 2)}
                  </div>
                </div>

                <h2 className="mt-2 text-sm font-bold text-[#191919] hover:underline cursor-pointer">
                  {user.name || user.email}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {user.role === 'ADMIN'
                    ? 'Quản trị viên Hệ thống'
                    : user.role === 'KNOWLEDGE_MANAGER'
                    ? 'Chuyên viên Quản lý Tri thức'
                    : 'Nhân viên Doanh nghiệp'}
                </p>

                <div className="mt-2.5">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${roleInfo.color}`}
                  >
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              {/* Real Stats Divider */}
              <div className="border-t border-[#e0dfdc] py-3 px-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 hover:bg-slate-50 py-0.5 rounded">
                  <span>Tài liệu khả dụng</span>
                  <span className="font-bold text-[#0a66c2]">
                    {isDataLoading ? '...' : `${totalDocs} tài liệu`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 hover:bg-slate-50 py-0.5 rounded">
                  <span>Phiên hỏi đáp</span>
                  <span className="font-bold text-[#0a66c2]">
                    {isDataLoading ? '...' : `${sessions.length} phiên`}
                  </span>
                </div>
              </div>

              {/* My Documents Link */}
              <div className="border-t border-[#e0dfdc] p-3 text-left">
                <Link
                  href="/documents"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#0a66c2] transition"
                >
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <span>Kho tài liệu của tôi</span>
                </Link>
              </div>
            </div>

            {/* Quick Access Shortcuts (Real Documents only) */}
            {documents.length > 0 && (
              <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3">
                <h3 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wider">
                  Tài liệu Gần đây
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {documents.slice(0, 4).map((doc) => (
                    <li key={doc.id}>
                      <Link
                        href="/documents"
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#edf3f8] hover:text-[#0a66c2] transition font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{doc.originalName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* ========================================================= */}
          {/* CỘT GIỮA (MIDDLE FEED - 6 Cols): Knowledge Stream & Query  */}
          {/* ========================================================= */}
          <section className="md:col-span-6 space-y-3">
            {/* "Start a Query" Box */}
            <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0a66c2] text-white font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                  {(user.name || user.email).slice(0, 2)}
                </div>
                <Link
                  href="/chat"
                  className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 hover:bg-slate-100/80 text-xs text-slate-500 transition font-medium text-left shadow-2xs"
                >
                  Hỏi đáp nhanh quy trình, quy chế, chính sách nội bộ...
                </Link>
              </div>

              {/* Action Buttons under query box */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 px-2">
                <Link
                  href="/chat"
                  className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#edf3f8] text-slate-600 hover:text-[#0a66c2] text-xs font-semibold transition"
                >
                  <MessageSquare className="w-4 h-4 text-[#0a66c2]" />
                  <span>Trợ lý Hỏi đáp</span>
                </Link>

                <Link
                  href="/documents"
                  className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#edf3f8] text-slate-600 hover:text-[#0a66c2] text-xs font-semibold transition"
                >
                  <UploadCloud className="w-4 h-4 text-[#057642]" />
                  <span>Kho Tài liệu</span>
                </Link>

                {(user.role === 'ADMIN' || user.role === 'KNOWLEDGE_MANAGER') && (
                  <Link
                    href="/pipeline"
                    className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#edf3f8] text-slate-600 hover:text-[#0a66c2] text-xs font-semibold transition"
                  >
                    <Cpu className="w-4 h-4 text-amber-600" />
                    <span>Tiến trình</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Filter Bar (Only show if documents exist) */}
            {documents.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                      activeTab === 'ALL'
                        ? 'bg-[#0a66c2] text-white'
                        : 'bg-white border border-[#e0dfdc] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tất cả ({documents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('INTERNAL')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                      activeTab === 'INTERNAL'
                        ? 'bg-[#0a66c2] text-white'
                        : 'bg-white border border-[#e0dfdc] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Nội bộ
                  </button>
                  <button
                    onClick={() => setActiveTab('PUBLIC')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                      activeTab === 'PUBLIC'
                        ? 'bg-[#0a66c2] text-white'
                        : 'bg-white border border-[#e0dfdc] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Công khai
                  </button>
                  <button
                    onClick={() => setActiveTab('CONFIDENTIAL')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                      activeTab === 'CONFIDENTIAL'
                        ? 'bg-[#0a66c2] text-white'
                        : 'bg-white border border-[#e0dfdc] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bảo mật
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  Thời gian thực
                </span>
              </div>
            )}

            {/* Knowledge Posts Feed (Real Data) */}
            <div className="space-y-3">
              {isDataLoading ? (
                <div className="bg-white rounded-lg border border-[#e0dfdc] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="w-6 h-6 border-2 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Đang tải danh sách tài liệu thực tế...</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                /* Empty state when NO real data exists */
                <div className="bg-white rounded-lg border border-[#e0dfdc] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Chưa có tài liệu nào trong kho tri thức</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Khi tài liệu được tải lên và lập chỉ mục qua hệ thống Ingestion, chúng sẽ hiển thị tại đây.
                  </p>
                  {(user.role === 'ADMIN' || user.role === 'KNOWLEDGE_MANAGER') && (
                    <Link
                      href="/documents"
                      className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-md bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold transition shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Tải tài liệu ngay</span>
                    </Link>
                  )}
                </div>
              ) : (
                /* Map real documents to LinkedIn-style Feed Cards */
                filteredDocs.map((doc) => {
                  const sensBadge = getSensitivityBadge(doc.sensitivity);
                  const statBadge = getStatusBadge(doc.status);
                  const formattedDate = new Date(doc.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <article
                      key={doc.id}
                      className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:border-slate-300 transition"
                    >
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-md bg-[#edf3f8] text-[#0a66c2] flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#191919] hover:underline cursor-pointer">
                                {doc.department?.name || 'Doanh nghiệp'}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${sensBadge.class}`}
                              >
                                {sensBadge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Tệp tin {doc.mimeType?.split('/')[1]?.toUpperCase() || 'VĂN BẢN'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formattedDate}
                              </span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statBadge.class}`}
                        >
                          {statBadge.label}
                        </span>
                      </div>

                      {/* Post Content */}
                      <div className="mt-3">
                        <h3 className="text-sm font-bold text-[#191919] leading-snug">
                          {doc.originalName}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          Dung lượng: {(doc.sizeBytes / 1024).toFixed(1)} KB
                          {doc.pageCount ? ` • ${doc.pageCount} trang tài liệu` : ''}
                          {doc._count?.chunks ? ` • ${doc._count.chunks} đoạn trích (chunks) đã bẻ nhỏ` : ''}
                        </p>
                      </div>

                      {/* Post Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {doc.tags.map((t) => (
                            <span
                              key={t.id}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                            >
                              #{t.tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Post Action Footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          href="/chat"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-[#edf3f8] text-[#0a66c2] font-bold text-xs transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Hỏi AI về tài liệu này</span>
                        </Link>

                        <div className="flex items-center gap-1">
                          <Link
                            href="/documents"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </Link>
                          <Link
                            href="/documents"
                            title="Mở trong kho tài liệu"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* ========================================================= */}
          {/* CỘT PHẢI (RIGHT RAIL - 3 Cols): Real Sessions & Status    */}
          {/* ========================================================= */}
          <aside className="md:col-span-3 space-y-3">
            {/* Real Chat Sessions Widget (Replaces fake trending news) */}
            <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3.5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#191919] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#0a66c2]" />
                  Hỏi đáp Gần đây
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Lịch sử</span>
              </div>

              {isDataLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải...</div>
              ) : sessions.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-500 font-medium">Chưa có phiên hỏi đáp nào</p>
                  <Link
                    href="/chat"
                    className="inline-block mt-2 text-xs font-semibold text-[#0a66c2] hover:underline"
                  >
                    Bắt đầu phiên hỏi đầu tiên →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {sessions.slice(0, 5).map((sess) => {
                    const formattedDate = new Date(sess.updatedAt || sess.createdAt).toLocaleDateString(
                      'vi-VN',
                      {
                        day: '2-digit',
                        month: '2-digit',
                      },
                    );

                    return (
                      <li key={sess.id} className="cursor-pointer group">
                        <Link href="/chat" className="block">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0a66c2] shrink-0" />
                            <h4 className="text-xs font-bold text-[#191919] group-hover:text-[#0a66c2] group-hover:underline transition line-clamp-1">
                              {sess.title || 'Cuộc trò chuyện mới'}
                            </h4>
                          </div>
                          <p className="text-[10px] text-slate-400 pl-3 mt-0.5">
                            Cập nhật: {formattedDate}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Platform Readiness Card */}
            <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#057642]" />
                Tiêu chuẩn Nền tảng
              </h3>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#057642]" />
                    <span>Dữ liệu Vector</span>
                  </span>
                  <span className="font-semibold text-[#057642]">Sẵn sàng</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#057642]" />
                    <span>Phân quyền Phòng ban</span>
                  </span>
                  <span className="font-semibold text-slate-800">Kích hoạt</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#057642]" />
                    <span>Tốc độ phản hồi</span>
                  </span>
                  <span className="font-semibold text-[#0a66c2]">&lt; 3 giây</span>
                </div>
              </div>
            </div>

            {/* Enterprise Legal / Info Footer */}
            <div className="text-[11px] text-slate-500 px-2 space-y-2 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-500">
                <span className="hover:text-[#0a66c2] cursor-pointer">Giới thiệu</span>
                <span className="hover:text-[#0a66c2] cursor-pointer">Trợ giúp</span>
                <span className="hover:text-[#0a66c2] cursor-pointer">Bảo mật</span>
                <span className="hover:text-[#0a66c2] cursor-pointer">Điều khoản SOP</span>
              </div>
              <p className="text-[10px] text-slate-400">
                DocuMind Corporation © 2026. Nền tảng Tri thức Doanh nghiệp.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
