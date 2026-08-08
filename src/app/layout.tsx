import type { Metadata } from 'next';
import { AppLayoutProvider } from '@/components/layout/app-layout-context';
import './globals.css';

export const metadata: Metadata = {
  title: '현대백화점 AI 재고 수익 최적화 플랫폼',
  description: 'B2B 재고 의사결정 및 증분 기여현금이익 최적화 타워',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-[#090d0b] text-zinc-100 antialiased selection:bg-[#0F4C3A] selection:text-white">
        <AppLayoutProvider>{children}</AppLayoutProvider>
      </body>
    </html>
  );
}
