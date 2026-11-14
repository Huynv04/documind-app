'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BookOpen, FileText, Home, LogOut, MessageSquare, ShieldCheck, Cpu, Search } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isFullWidthPage = pathname?.startsWith('/chat');

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Admin',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'KNOWLEDGE_MANAGER':
        return {
          label: 'KM Manager',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      default:
        return {
          label: 'Nhân viên',
          color: 'bg-[#edf3f8] text-[#0a66c2] border-[#0a66c2]/20',
        };
    }
  };

  const roleBadge = getRoleBadge(user.role);

  const navLinks = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/chat', label: 'Hỏi đáp Tri thức', icon: MessageSquare },
    { href: '/documents', label: 'Kho Tài liệu', icon: FileText },
    ...((user.role === 'ADMIN' || user.role === 'KNOWLEDGE_MANAGER')
      ? [{ href: '/pipeline', label: 'Tiến trình Xử lý', icon: Cpu }]
      : []),
    ...(user.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Quản trị', icon: ShieldCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e0dfdc] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div
        className={`${
          isFullWidthPage ? 'w-full px-4 sm:px-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        } h-14 flex items-center justify-between gap-2 sm:gap-4`}
      >
        {/* Left: Brand + Search Bar (LinkedIn style) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* Document icon in blue square */}
            <div className="w-8 h-8 rounded-md bg-[#0a66c2] hover:bg-[#004182] flex items-center justify-center text-white shadow-xs transition shrink-0">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#191919] hidden sm:inline">
              DocuMind
            </span>
          </Link>

          {/* LinkedIn-styled Search Bar */}
          <div className="relative hidden md:flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm quy chế, SOP, biểu mẫu..."
              className="w-44 lg:w-56 xl:w-64 pl-9 pr-3 py-1.5 rounded-md bg-[#edf3f8] hover:bg-[#e4ebf2] focus:bg-white text-xs text-[#191919] placeholder-slate-500 border border-transparent focus:border-[#0a66c2] focus:outline-none transition shadow-none"
            />
          </div>
        </div>

        {/* Center / Nav Items */}
        <nav className="flex items-center h-full gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex flex-col items-center justify-center h-14 px-2.5 sm:px-3.5 text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'text-[#0a66c2] font-semibold after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-[#0a66c2]'
                    : 'text-slate-600 hover:text-[#191919] hover:bg-slate-50/60'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 mb-1 shrink-0 ${isActive ? 'text-[#0a66c2]' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap leading-none tracking-tight">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0a66c2] text-white font-bold flex items-center justify-center text-xs shadow-xs uppercase shrink-0">
              {(user.name || user.email).slice(0, 2)}
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <div className="text-xs font-semibold text-[#191919] truncate max-w-[130px]">
                {user.name || user.email}
              </div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleBadge.color} mt-0.5`}
              >
                {roleBadge.label}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Đăng xuất khỏi hệ thống"
            className="flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-medium transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
}

