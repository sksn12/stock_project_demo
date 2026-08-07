'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { CenterInventoryMap } from '@/components/dashboard/center-inventory-map';
import { MOCK_INVENTORY_ITEMS, MOCK_OPTIMIZATION_CASES } from '@/lib/mock-data';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Package, 
  Store, 
  Clock, 
  ChevronRight,
  Layers,
  Building2,
  DollarSign
} from 'lucide-react';

export default function DashboardPage() {
  const items = MOCK_INVENTORY_ITEMS;

  // 더현대 서울 전사 총계 수치
  const metrics = useMemo(() => {
    const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalSelling = items.reduce((acc, i) => acc + i.sellingPrice * i.quantity, 0);
    const totalCost = items.reduce((acc, i) => acc + i.costPrice * i.quantity, 0);
    const directPurchaseQty = items.filter((i) => i.purchaseType === '직매입').reduce((acc, i) => acc + i.quantity, 0);
    const directPurchaseRatio = ((directPurchaseQty / totalQty) * 100).toFixed(1);

    const riskItems = items.filter((i) => ['DEAD_STOCK', 'CRITICAL_NEAR', 'WARNING'].includes(i.status));
    const riskTotalSelling = riskItems.reduce((acc, i) => acc + i.sellingPrice * i.quantity, 0);
    const savedDisposalCost = riskItems.reduce((acc, i) => acc + i.estimatedDisposalCost * i.quantity, 0);

    return {
      totalSelling,
      totalCost,
      directPurchaseRatio,
      riskCount: riskItems.length,
      riskTotalSelling,
      savedDisposalCost,
    };
  }, [items]);

  // 더현대 서울 층별 위험재고 분포 데이터
  const floorData = useMemo(() => {
    const FLOORS = [
      { key: '더현대 서울 2F (여성패션)', name: '2F 여성패션' },
      { key: '더현대 서울 3F (남성/잡화)', name: '3F 남성/잡화' },
      { key: '더현대 서울 B1 (식품관)', name: 'B1 Tasty SEOUL 식품관' },
      { key: '더현대 서울 1F (뷰티/리빙)', name: '1F 뷰티/리빙' },
    ];

    return FLOORS.map((floor) => {
      const floorItems = items.filter((i) => i.store === floor.key);
      const totalAmount = floorItems.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
      
      const criticalAmount = floorItems
        .filter((i) => ['DEAD_STOCK', 'CRITICAL_NEAR'].includes(i.status))
        .reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
        
      const warningAmount = floorItems
        .filter((i) => i.status === 'WARNING')
        .reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);

      const criticalRatio = totalAmount > 0 ? (criticalAmount / totalAmount) * 100 : 0;
      const warningRatio = totalAmount > 0 ? (warningAmount / totalAmount) * 100 : 0;

      return {
        name: floor.name,
        count: floorItems.length,
        totalAmount,
        criticalAmount,
        warningAmount,
        criticalRatio,
        warningRatio,
        riskRatio: (criticalRatio + warningRatio).toFixed(1),
      };
    });
  }, [items]);

  // 더현대 서울 직매입 악성재고 TOP 5
  const topRiskItems = useMemo(() => {
    return [...items].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  }, [items]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Banner Section */}
        <div className="bg-[#0F4C3A] text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>THE HYUNDAI SEOUL · 직매입 전용 관제</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">더현대 서울 AI 재고 수익 최적화 대시보드</h1>
            <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
              2F 패션, 3F 남성잡화, B1 식품관, 1F 뷰티리빙 매장의 직매입 악성재고 손실을 선제 예방하고, 증분 기여현금이익 시뮬레이션을 제공합니다.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10">
            <Link
              href="/inventory/risk"
              className="px-4 py-2.5 bg-white text-[#0F4C3A] font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>위험재고 관제 전체보기</span>
            </Link>
            <Link
              href="/strategy/generate"
              className="px-4 py-2.5 bg-[#9E7C3B] hover:bg-[#85672E] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI 전략 수립 시작</span>
            </Link>
          </div>
        </div>

        {/* Metric Strip (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>더현대 서울 관리 재고 총액</span>
              <Package className="w-4 h-4 text-[#0F4C3A]" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              ₩{(metrics.totalSelling / 100000000).toFixed(2)}억원
            </p>
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>정상 판매가 총액 기준</span>
              <span className="font-bold text-[#0F4C3A]">20개 카테고리</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>직매입 리스크 비중</span>
              <Layers className="w-4 h-4 text-[#9E7C3B]" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{metrics.directPurchaseRatio}%</p>
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>손익책임 100% 품목</span>
              <span className="font-bold text-amber-600">집중 관리 대상</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>위험·악성 재고 총액</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 tabular-nums">
              ₩{(metrics.riskTotalSelling / 100000000).toFixed(2)}억원
            </p>
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>전체 재고의 {((metrics.riskTotalSelling / metrics.totalSelling) * 100).toFixed(1)}%</span>
              <span className="font-bold text-red-600">{metrics.riskCount}개 품목 감지</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>AI 누적 회피 폐기비용</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">
              +₩{metrics.savedDisposalCost.toLocaleString()}
            </p>
            <div className="flex justify-between items-center text-[11px] text-emerald-600 pt-1 border-t border-slate-100 font-medium">
              <span>손실 방어 기여</span>
              <span className="font-bold">100% 회피 성공</span>
            </div>
          </div>
        </div>

        <CenterInventoryMap />

        {/* Middle Main Content: Floor Pipeline & AI Recommended Top Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Floor Risk Distribution Pipeline (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0F4C3A]" />
                  <span>더현대 서울 층별 위험재고 비교 파이프라인</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">2F 패션, 3F 남성잡화, B1 식품관, 1F 뷰티리빙 층별 위험금액 및 비율</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 심각·폐기임박</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 주의·경계</span>
              </div>
            </div>

            <div className="space-y-4">
              {floorData.map((floor) => (
                <div key={floor.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>{floor.name} <span className="text-[11px] text-slate-400 font-normal">({floor.count}개 품목)</span></span>
                    <span className="tabular-nums font-mono text-slate-900">위험 ₩{(floor.totalAmount / 100000000).toFixed(2)}억원</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-red-500 transition-all duration-500"
                      style={{ width: `${floor.criticalRatio}%` }}
                      title={`심각: ₩${(floor.criticalAmount / 10000).toLocaleString()}만원`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${floor.warningRatio}%` }}
                      title={`주의: ₩${(floor.warningAmount / 10000).toLocaleString()}만원`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>심각 {floor.criticalRatio.toFixed(1)}% (₩{(floor.criticalAmount / 100000000).toFixed(2)}억)</span>
                    <span className="font-bold text-slate-700">위험 비중 {floor.riskRatio}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Strategy Executability Status (1 Col) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9E7C3B]" />
                <span>더현대 서울 최근 전략 이행률</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">LIVE</span>
            </div>

            <div className="bg-[#0F4C3A] text-white p-4 rounded-xl space-y-2 shadow-xs">
              <p className="text-[11px] text-emerald-100 font-medium">전략 이행률</p>
              <p className="text-3xl font-bold tabular-nums">87.5%</p>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[87.5%]" />
              </div>
              <p className="text-[10px] text-emerald-100 text-right">총 8건 중 7건 승인 완료</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] text-slate-500">증분 기여이익</p>
                <p className="font-bold text-slate-900 text-base tabular-nums">₩29.12M</p>
                <p className="text-[9px] text-emerald-600">목표 대비 +18.4%</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] text-slate-500">평균 소진 단축</p>
                <p className="font-bold text-slate-900 text-base tabular-nums">12.4일</p>
                <p className="text-[9px] text-slate-500">전월 대비 3.1일 개선</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-800 mb-2">최근 확정 최적화 케이스</p>
              <Link
                href="/strategy/CASE-2026-001"
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {MOCK_OPTIMIZATION_CASES[0].title}
                  </p>
                  <p className="text-[10px] text-slate-500">예상 순마진 기여 ₩29,120,000</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-all" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top 5 Urgent Risk Items Table Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>더현대 서울 긴급 처리 직매입 악성재고 TOP 5</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">보관일수 및 위험점수 높은 우선 청산 대상 품목</p>
            </div>
            <Link
              href="/inventory/risk"
              className="text-xs text-[#0F4C3A] font-bold hover:underline flex items-center gap-1"
            >
              <span>전체 20개 위험 목록 보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-28">위험 등급</th>
                  <th className="py-2.5 px-3 w-32">상품코드</th>
                  <th className="py-2.5 px-3 min-w-[220px]">상품명</th>
                  <th className="py-2.5 px-3 w-36">층 / 카테고리</th>
                  <th className="py-2.5 px-3 w-24 text-right">현재고</th>
                  <th className="py-2.5 px-3 w-28 text-right">정상 판매가</th>
                  <th className="py-2.5 px-3 w-28 text-center">위험도 점수</th>
                  <th className="py-2.5 px-3 w-28 text-center">AI 전략</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {topRiskItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded border font-bold ${
                          item.status === 'DEAD_STOCK'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status === 'DEAD_STOCK' ? '악성 재고' : '악성 임박'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.code}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 truncate max-w-[240px]">{item.name}</p>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <p className="text-slate-800 font-medium">{item.store}</p>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {item.quantity.toLocaleString()}개
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <p className="text-slate-900 font-bold">₩{item.sellingPrice.toLocaleString()}</p>
                      
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-red-600 tabular-nums">{item.riskScore}점</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(D-{item.expiryDaysLeft})</span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <Link
                        href={`/strategy/generate?items=${item.id}`}
                        className="px-2.5 py-1 bg-[#0F4C3A] text-white rounded text-[11px] font-bold hover:bg-[#0B392B] inline-flex items-center gap-1 transition-all"
                      >
                        <Sparkles className="w-3 h-3 text-[#9E7C3B]" />
                        <span>수립</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
