'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAppLayout } from './app-layout-context';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, closeSidebar, toggleSidebar } = useAppLayout();

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="사이드바 닫기"
          onClick={closeSidebar}
          className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px] md:hidden"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header isSidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
