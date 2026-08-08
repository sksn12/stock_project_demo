"use client";

import {
  Bell,
  ArrowUpRight,
  User,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const isInventoryArea = pathname.startsWith("/inventory");

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Brand Location Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "사이드바 접기" : "사이드바 열기"}
          aria-expanded={isSidebarOpen}
          aria-controls="primary-navigation"
          title={isSidebarOpen ? "사이드바 접기" : "사이드바 열기"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0F4C3A] focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* User & Global Actions */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#0F4C3A] font-bold text-xs">
            <User className="w-4 h-4 text-[#0F4C3A]" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              김영만 수석 MD
            </p>
            <p className="text-[10px] text-slate-500">
              {isInventoryArea
                ? "현대그린푸드 재고운영"
                : "더현대 서울 총괄 재고전략"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
