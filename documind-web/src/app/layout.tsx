import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';

export const metadata: Metadata = {
  title: 'DocuMind AI – Nền tảng Tra cứu Tri thức Nội bộ',
  description: 'DocuMind AI: Trợ lý RAG & Knowledge Base nội bộ cho doanh nghiệp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased bg-[#f4f2ee]" style={{ colorScheme: 'light' }}>
      <body className="min-h-full flex flex-col bg-[#f4f2ee] text-[#191919] selection:bg-[#0a66c2]/20 selection:text-[#0a66c2]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
