'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken') || searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken') || searchParams.get('refresh');

    if (accessToken && refreshToken) {
      try {
        // Decode user payload from token
        const payloadBase64 = accessToken.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));

        setSession({
          accessToken,
          refreshToken,
          user: {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email.split('@')[0],
            role: decoded.role || 'EMPLOYEE',
          },
        });

        router.push('/');
      } catch {
        setTimeout(() => {
          setError('Không thể xử lý mã token xác thực từ Google OAuth2.');
        }, 0);
      }
    } else {
      // Check if opened inside popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          setSession(event.data.payload);
          router.push('/');
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [searchParams, router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4 font-sans text-white">
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
        {error ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Lỗi xác thực SSO</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay về trang Đăng nhập</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Đang thiết lập phiên làm việc...
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đang giải mã token xác thực và thẩm định phân quyền RBAC của bạn.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 font-sans text-xs">
          Đang tải phiên xác thực...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
