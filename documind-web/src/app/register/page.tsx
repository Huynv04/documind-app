'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/api';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  LockKeyhole,
} from 'lucide-react';

const DEPARTMENTS = [
  'Kỹ thuật & Vận hành',
  'Nhân sự (HR)',
  'Tài chính - Kế toán',
  'Kinh doanh & Marketing',
  'Ban Giám đốc & CNTT',
  'Pháp chế & Tuân thủ',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Kỹ thuật & Vận hành');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time password policy validation criteria
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasSpecialChar;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Calculate Password Strength Level (0 - 3)
  const strengthScore = [hasMinLength, hasUpperCase, hasSpecialChar].filter(Boolean).length;
  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'Chưa nhập', color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400' };
    if (strengthScore <= 1) return { label: 'Yếu', color: 'bg-rose-500', text: 'text-rose-500' };
    if (strengthScore === 2) return { label: 'Khá', color: 'bg-amber-500', text: 'text-amber-500' };
    return { label: 'Mạnh', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strengthInfo = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Mật khẩu chưa đáp ứng đủ các tiêu chuẩn bảo mật.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    if (!agreedTerms) {
      setErrorMsg('Vui lòng đồng ý với Quy chế An toàn Thông tin Doanh nghiệp.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(trimmedName, trimmedEmail, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.messages.join(' | '));
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ API. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      {/* ======================================================== */}
      {/* 1. LEFT COLUMN: BRAND HERO & SECURITY VALUE PROPOSITION */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#004182] text-white p-12 flex-col justify-between overflow-hidden border-r border-[#003366]">
        {/* Subtle geometric grid accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Brand Top */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#0a66c2] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">DocuMind AI</span>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                Identity & Access
              </span>
            </div>
          </div>
        </div>

        {/* Center Presentation: Employee Onboarding Highlights */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Đăng ký Tài khoản Nhân viên Nội bộ
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Khám phá kho tri thức doanh nghiệp. <br />
            <span className="text-sky-300">
              Rút ngắn 80% thời gian tra cứu.
            </span>
          </h2>

          <p className="text-sm text-slate-200 leading-relaxed">
            Tài khoản mới được cấp quyền tự động theo phòng ban chuyên môn để tra cứu quy chế, quy trình chuẩn (SOP) và tài liệu nội bộ với bảo mật cao nhất.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold mb-0.5">
                  Tự động phân vùng tài liệu theo phòng ban
                </strong>
                <span className="text-slate-200 leading-relaxed">
                  Chỉ nhìn thấy và truy vấn các văn bản đúng thẩm quyền và trách nhiệm công việc của bạn.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <LockKeyhole className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold mb-0.5">
                  Bảo mật tài khoản doanh nghiệp chuẩn ISO
                </strong>
                <span className="text-slate-200 leading-relaxed">
                  Thông tin đăng nhập được mã hóa an toàn và xác thực qua JWT token có thời hạn.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-slate-300">
          <span>Quy chế An toàn Thông tin Doanh nghiệp</span>
          <span className="font-semibold text-white/80">RBAC Enabled</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. RIGHT COLUMN: REGISTRATION FORM                       */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-6 my-auto">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">DocuMind AI</span>
          </div>

          {/* Form Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tạo tài khoản nội bộ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Đăng ký để truy cập kho tài liệu và trợ lý tra cứu quy chế công ty.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                {errorMsg}
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Corporate Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email công ty
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.vn"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Phòng ban trực thuộc
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                {password.length > 0 && (
                  <span className={`text-[11px] font-bold ${strengthInfo.text}`}>
                    Độ mạnh: {strengthInfo.label}
                  </span>
                )}
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
              {password.length > 0 && (
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                    style={{ width: `${(strengthScore / 3) * 100}%` }}
                  />
                </div>
              )}

              {/* Real-time Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1.5">
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasMinLength
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Tối thiểu 6 ký tự</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasUpperCase
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {hasUpperCase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Chứa ít nhất 1 chữ in hoa (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasSpecialChar
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Chứa ít nhất 1 ký tự đặc biệt (!@#$%...)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">
                  Mật khẩu xác nhận chưa khớp.
                </p>
              )}
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0a66c2] focus:ring-[#0a66c2] cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="text-xs text-slate-600 leading-relaxed cursor-pointer"
              >
                Tôi đồng ý tuân thủ quy chế xử lý dữ liệu và cam kết không phát tán tài liệu mật nội bộ ra bên ngoài.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid || !passwordsMatch || !agreedTerms}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#0a66c2] hover:bg-[#004182] text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký tài khoản</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center text-xs text-slate-500">
            Đã có tài khoản nhân viên?{' '}
            <Link
              href="/login"
              className="text-[#0a66c2] font-bold hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
