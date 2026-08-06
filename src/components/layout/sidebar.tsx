'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Boxes, 
  AlertTriangle, 
  Sparkles, 
  History, 
  BarChart3, 
  Building2,
  ShieldCheck,
  PlayCircle
} from 'lucide-react';

const NAV_ITEMS: { name: string; href: string; icon: any; badge?: string }[] = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '채널 통합재고', href: '/inventory/all', icon: Boxes },
  { name: '전략 기록 & 비교', href: '/strategy/history', icon: History },
  { name: '실행 전략 & 성과 관제', href: '/strategy/execution', icon: PlayCircle },
  { name: '재고 건강도 통계', href: '/analytics', icon: BarChart3 },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isInventoryArea = pathname.startsWith('/inventory');

  return (
    <aside
      id="primary-navigation"
      aria-label="주요 메뉴"
      className={`fixed inset-y-0 left-0 flex h-screen flex-col justify-between bg-white border-r border-slate-200 select-none shadow-sm transition-[width,transform] duration-200 ease-out md:sticky md:top-0 md:z-30 md:translate-x-0 ${
        isOpen ? 'w-72 translate-x-0 md:w-64' : 'w-72 -translate-x-full md:w-[76px]'
      } z-50 shrink-0`}
    >
      <div>
        {/* Brand Header */}
        <div className={`flex items-center border-b border-slate-100 ${isOpen ? 'justify-start p-5' : 'justify-center p-3'}`}>
          <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-lg bg-[#0F4C3A] flex items-center justify-center text-white font-bold text-lg shadow-sm border border-[#0B392B]">
              H
            </div>
            <div className={isOpen ? 'block' : 'hidden'}>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                HYUNDAI <span className="text-[#9E7C3B] text-xs font-semibold">{isInventoryArea ? 'GROUP' : 'SEOUL'}</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">{isInventoryArea ? '현대그린푸드 재고 허브' : '재고 수익 최적화 타워'}</p>
            </div>
          </div>
        </div>

        {/* Department Info */}
        <div className={`mx-3 my-3 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center text-xs text-slate-700 ${isOpen ? 'gap-2.5 p-2.5' : 'justify-center p-2'}`} title={isOpen ? undefined : (isInventoryArea ? '판매처 통합재고 관제' : '더현대 서울 재고전략팀')}>
          <Building2 className="w-4 h-4 text-[#0F4C3A]" />
          <div className={isOpen ? 'overflow-hidden' : 'hidden'}>
            <p className="font-semibold text-[#0F4C3A] truncate">{isInventoryArea ? '판매처 통합재고 관제' : '더현대 서울 재고전략팀'}</p>
            <p className="text-[10px] text-slate-500">{isInventoryArea ? '온라인·오프라인 판매처' : '2F·3F·B1·1F 전관 관제'}</p>
          </div>
        </div>

        {/* Nav Navigation Links */}
        <nav className="px-3 space-y-1">
          <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isOpen ? 'block' : 'hidden'}`}>
            Operation Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={isOpen ? undefined : item.name}
                className={`flex items-center rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#0F4C3A] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                } ${isOpen ? 'justify-between px-3 py-2.5' : 'justify-center px-2 py-3'}`}
              >
                <div className={`flex items-center ${isOpen ? 'gap-2.5' : 'justify-center'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={isOpen ? 'block' : 'hidden'}>{item.name}</span>
                </div>
                {item.badge && isOpen && (
                  <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-tight ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`m-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center ${isOpen ? 'gap-2 p-3' : 'justify-center p-2'}`} title={isOpen ? undefined : (isInventoryArea ? '판매처 통합 데이터' : '더현대 서울 전용 관제')}>
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className={isOpen ? 'block' : 'hidden'}>
          <p className="text-slate-800 font-semibold text-[11px]">{isInventoryArea ? '판매처 통합 데이터' : '더현대 서울 전용 관제'}</p>
          <p className="text-[10px] text-slate-400">{isInventoryArea ? 'SKU·LOT·판매처별 조회' : '실시간 직매입 시뮬레이션'}</p>
        </div>
      </div>
    </aside>
  );
}
