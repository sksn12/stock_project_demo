'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { MOCK_OPTIMIZATION_CASES } from '@/lib/mock-data';
import { OptimizationCase } from '@/lib/types';
import {
  PlayCircle,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UserCheck,
  TrendingUp,
  X,
  ExternalLink,
  Zap,
  Activity
} from 'lucide-react';

type StrategyRecordStatus = 'EXECUTING' | 'FINISHED' | 'PRE_APPROVAL' | 'APPROVED';

const recordStatusMeta: Record<StrategyRecordStatus, { label: string; className: string }> = {
  EXECUTING: { label: '실행중', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  FINISHED: { label: '실행완료', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  PRE_APPROVAL: { label: '승인 전', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  APPROVED: { label: '승인 완료', className: 'bg-sky-50 text-sky-800 border-sky-200' },
};

function getRecordStatus(strategyCase: OptimizationCase): StrategyRecordStatus {
  if (strategyCase.status === 'FINISHED') return 'FINISHED';
  if (strategyCase.status === 'EXECUTING') return 'EXECUTING';
  if (strategyCase.status === 'APPROVED') return 'APPROVED';
  return 'PRE_APPROVAL';
}

export default function StrategyExecutionPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<OptimizationCase | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'true' || params.get('modal') === 'open') {
        return MOCK_OPTIMIZATION_CASES[0];
      }
    }
    return null;
  });

  // 승인 전부터 실행 완료까지의 전략 기록 목록
  const executedCases = MOCK_OPTIMIZATION_CASES.filter((c) =>
    c.status === 'COMPLETED' || c.status === 'APPROVED' || c.status === 'EXECUTING' || c.status === 'FINISHED'
  );

  const filteredCases = executedCases.filter((c) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      getRecordStatus(c) === statusFilter;

    const matchesCompany =
      companyFilter === 'ALL' ||
      c.company === companyFilter ||
      c.targetItems.some((i) => i.company === companyFilter);

    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetItems.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesCompany && matchesSearch;
  });

  const totalExecutedCount = executedCases.length;
  const completedCount = executedCases.filter(c => c.status === 'FINISHED' || c.executionStatus === 'COMPLETED').length;
  const executingCount = executedCases.filter(c => c.status === 'EXECUTING' || c.executionStatus === 'EXECUTING').length;

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI 전략 기록 & 성과
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              최종 승인된 전략의 예상 수치와 실제 소진 결과의 오차를 관제하고 대비합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/strategy/history"
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>AI 전략 및 시뮬레이션</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>총 실행 건수</span>
              <PlayCircle className="w-4 h-4 text-[#0F4C3A]" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{totalExecutedCount}건</p>
            <p className="text-[11px] text-slate-500 mt-1">온라인 프로모션 구동</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>실행완료</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">{completedCount}건</p>
            <p className="text-[11px] text-emerald-600 mt-1">온라인 정산 & 소진 회수 완료</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>실행중</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums">{executingCount}건</p>
            <p className="text-[11px] text-amber-600 mt-1">온라인 타깃 프로모션 구동 중</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: '전체' },
              { id: 'EXECUTING', label: '실행중' },
              { id: 'FINISHED', label: '실행완료' },
              { id: 'PRE_APPROVAL', label: '승인 전' },
              { id: 'APPROVED', label: '승인 완료' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#0F4C3A] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-[#0F4C3A] cursor-pointer"
            >
              <option value="ALL">전체 계열사</option>
              <option value="현대리바트">현대리바트</option>
              <option value="현대그린푸드">현대그린푸드</option>
              <option value="현대웰니스">현대웰니스</option>
            </select>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="상품명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F4C3A]"
              />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Executed Strategy Cards */}
        <div className="space-y-4">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span>조건에 일치하는 실행 전략 케이스가 없습니다.</span>
            </div>
          ) : (
            filteredCases.map((optCase) => {
              const mainItem = optCase.targetItems[0];
              const selectedOpt = optCase.options.find((o) => o.id === optCase.selectedOptionId) || optCase.options[0];

              const actualSales = optCase.actualSalesQty || Math.round(selectedOpt.expectedSalesQty * 0.86);
              const actualMargin = optCase.actualNetContributionMargin || Math.round(selectedOpt.expectedNetContributionMargin * 0.9);

              const salesProgressPercent = Math.min(100, Math.round((actualSales / selectedOpt.expectedSalesQty) * 100));
              const marginAchievePercent = Math.round((actualMargin / selectedOpt.expectedNetContributionMargin) * 100);

              const displayTitle = optCase.title.replace(/\s*\((실행\s*진행\s*중|실행\s*완료|실행\s*중|EXECUTING|FINISHED|COMPLETED)\)/gi, '');
              const recordStatus = getRecordStatus(optCase);
              const statusMeta = recordStatusMeta[recordStatus];
              const periodMetric = optCase.id === 'CASE-2026-003'
                ? { detail: '7/27 마감 (3일 초과 소요)', percent: 125, overdue: true }
                : optCase.id === 'CASE-2026-004'
                  ? { detail: '8/3 마감 (1일 지연 중)', percent: 150, overdue: true }
                  : { detail: '8/5 마감 예정 (D-2)', percent: 83, overdue: false };
              const salesStatus = salesProgressPercent >= 100 ? '목표 달성' : salesProgressPercent >= 70 ? '양호' : '확인 필요';
              const marginStatus = marginAchievePercent >= 100 ? '목표 달성' : marginAchievePercent >= 80 ? '달성 임박' : '확인 필요';

              return (
                <div
                  key={optCase.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all space-y-4"
                >
                  {/* Compact Header & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0F4C3A] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          {optCase.id}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                          optCase.company === '현대리바트'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : optCase.company === '현대그린푸드'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {optCase.company || mainItem.company}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{displayTitle}</h3>
                      <p className="text-xs text-slate-500">대상 상품: {mainItem.name} ({mainItem.store})</p>
                    </div>

                    <div className="text-xs sm:text-right text-slate-500 space-y-0.5 shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                      <p className="font-semibold text-slate-700 flex items-center sm:justify-end gap-1 text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 text-[#0F4C3A]" />
                        <span>승인자: {optCase.approverName || '김영만 수석 MD (온라인 재고전략팀)'}</span>
                      </p>
                      <p className="text-[10px] font-mono">승인 시각: {optCase.approvedAt || optCase.createdAt}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-600"><Activity className="h-4 w-4 text-blue-600" />목표 수량 소진율</span>
                        <span className="font-mono text-slate-500">({actualSales}/{selectedOpt.expectedSalesQty}개)</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <strong className="font-mono text-2xl font-black text-slate-950">{salesProgressPercent}%</strong>
                        <span className={`rounded px-2 py-1 text-[10px] font-bold ${salesProgressPercent >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{salesStatus}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, salesProgressPercent)}%` }} /></div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-600"><AlertCircle className={`h-4 w-4 ${periodMetric.overdue ? 'text-rose-600' : 'text-amber-600'}`} />목표 기간 경과율</span>
                        <span className={`font-medium ${periodMetric.overdue ? 'text-rose-600' : 'text-slate-500'}`}>{periodMetric.detail}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <strong className={`font-mono text-2xl font-black ${periodMetric.overdue ? 'text-rose-600' : 'text-slate-950'}`}>{periodMetric.percent}%</strong>
                        <span className={`rounded px-2 py-1 text-[10px] font-bold ${periodMetric.overdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>{periodMetric.overdue ? '기한 초과' : '정상 진행'}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full transition-all duration-500 ${periodMetric.overdue ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, periodMetric.percent)}%` }} /></div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-600"><TrendingUp className="h-4 w-4 text-emerald-600" />목표 증분이익 달성률</span>
                        <span className="font-mono text-slate-500">(₩{Math.round(actualMargin / 10000).toLocaleString()}만 / ₩{Math.round(selectedOpt.expectedNetContributionMargin / 10000).toLocaleString()}만)</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <strong className="font-mono text-2xl font-black text-slate-950">{marginAchievePercent}%</strong>
                        <span className={`rounded px-2 py-1 text-[10px] font-bold ${marginAchievePercent >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{marginStatus}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, marginAchievePercent)}%` }} /></div>
                    </div>
                  </div>

                  {/* Target Reach Success/Failure Badge ONLY for FINISHED Cases */}
                  {(optCase.status === 'FINISHED' || optCase.executionStatus === 'COMPLETED') && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(optCase.actualSalesQty || 0) >= (selectedOpt.expectedSalesQty || 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                          🟢 [목표치 도달 성공] 최종 소진 목표 달성 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-bold text-[11px]">
                          🔴 [목표치 도달 실패] 최종 소진 목표 미달 종료
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${periodMetric.overdue ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <AlertCircle className={`h-4 w-4 shrink-0 ${periodMetric.overdue ? 'text-amber-600' : 'text-slate-500'}`} />
                      <span className="truncate font-medium">
                        <strong className="mr-1">[{periodMetric.overdue ? '기간 지연 경고' : '성과 관제'}]</strong>
                        {optCase.varianceReason || '메인 기획전 반응과 실제 판매 성과를 지속 관제 중입니다.'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCase(optCase)}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800 cursor-pointer"
                    >
                      <span>상세 관제 & 오차 분석</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detailed Performance Modal (Tier 2: Detailed Popup Window) */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-[#0F4C3A] px-2.5 py-0.5 rounded text-white border border-emerald-500">
                      {selectedCase.id}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">온라인 실행 상세 관제</span>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-white">{selectedCase.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    대상 상품: {selectedCase.targetItems[0]?.name} ({selectedCase.targetItems[0]?.store})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
                {/* Approval Audit Info Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">승인 정보</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      승인자: {selectedCase.approverName || '김영만 수석 MD (온라인 재고전략팀)'} | 승인 시각: {selectedCase.approvedAt || selectedCase.createdAt}
                    </p>
                  </div>
                </div>

                {/* Section 1: Detailed Performance Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#0F4C3A]" />
                    <span>1. 예상 전략 목표 vs 실제 전략 결과 정밀 비교</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                          <th className="py-2.5 px-4">지표 구분</th>
                          <th className="py-2.5 px-4 text-right font-bold text-slate-700">예상 전략 목표</th>
                          <th className="py-2.5 px-4 text-right font-bold text-[#0F4C3A]">실제 전략 결과</th>
                          <th className="py-2.5 px-4 text-right font-bold">목표 대비 오차</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(() => {
                          const selectedOpt = selectedCase.options[0];
                          const mainItem = selectedCase.targetItems[0];
                          const actualSales = selectedCase.actualSalesQty || 110;
                          const actualDays = selectedCase.actualLiquidationDays || 15;
                          const actualMargin = selectedCase.actualNetContributionMargin || 26210000;
                          const actualRemain = selectedCase.actualRemainingQty || 35;

                          const salesDiff = actualSales - selectedOpt.expectedSalesQty;
                          const daysDiff = actualDays - selectedOpt.liquidationDays;
                          const marginDiff = actualMargin - selectedOpt.expectedNetContributionMargin;
                          const remainDiff = actualRemain - (mainItem.quantity - selectedOpt.expectedSalesQty);

                          return (
                            <>
                              <tr>
                                <td className="py-2.5 px-4 font-sans font-bold text-slate-800">총 매출액</td>
                                <td className="py-2.5 px-4 text-right text-slate-600">₩{Math.round(selectedOpt.expectedRevenue / 10000).toLocaleString()}만원</td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">₩{Math.round((selectedOpt.expectedRevenue * (actualSales / selectedOpt.expectedSalesQty)) / 10000).toLocaleString()}만원</td>
                                <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                                  -₩{Math.round((selectedOpt.expectedRevenue * (1 - actualSales / selectedOpt.expectedSalesQty)) / 10000).toLocaleString()}만원 ({((actualSales / selectedOpt.expectedSalesQty - 1) * 100).toFixed(1)}%)
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 px-4 font-sans font-bold text-slate-800">소진 판매량</td>
                                <td className="py-2.5 px-4 text-right text-slate-600">{selectedOpt.expectedSalesQty}개</td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{actualSales}개</td>
                                <td className={`py-2.5 px-4 text-right font-bold ${salesDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {salesDiff >= 0 ? `+${salesDiff}` : salesDiff}개 ({((salesDiff / selectedOpt.expectedSalesQty) * 100).toFixed(1)}%)
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 px-4 font-sans font-bold text-slate-800">소진 기간</td>
                                <td className="py-2.5 px-4 text-right text-slate-600">{selectedOpt.liquidationDays}일 완판</td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{actualDays}일 소요</td>
                                <td className={`py-2.5 px-4 text-right font-bold ${daysDiff <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {daysDiff <= 0 ? `${daysDiff}일 (단축)` : `+${daysDiff}일 (지연)`}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 px-4 font-sans font-bold text-slate-800">증분 기여현감이익</td>
                                <td className="py-2.5 px-4 text-right text-slate-600">
                                  ₩{Math.round(selectedOpt.expectedNetContributionMargin / 10000).toLocaleString()}만원
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#0F4C3A]">
                                  ₩{Math.round(actualMargin / 10000).toLocaleString()}만원
                                </td>
                                <td className={`py-2.5 px-4 text-right font-bold ${marginDiff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {marginDiff >= 0 ? '+' : ''}₩{Math.round(marginDiff / 10000).toLocaleString()}만원
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2.5 px-4 font-sans font-bold text-slate-800">전략 후 잔여재고</td>
                                <td className="py-2.5 px-4 text-right text-slate-600">
                                  {(mainItem.quantity - selectedOpt.expectedSalesQty)}개
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{actualRemain}개</td>
                                <td className={`py-2.5 px-4 text-right font-bold ${remainDiff <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {remainDiff <= 0 ? `${remainDiff}개` : `+${remainDiff}개 (잔존)`}
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Online Sales Sparkline Chart */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#0F4C3A]" />
                    <span>2. 일별 소진 추이 (예상 전략 목표 궤적 vs 실제 재고 소진 곡선)</span>
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-0.5 bg-slate-400 border border-dashed border-slate-600 inline-block"></span>
                          <span>예상 전략 목표 궤적</span>
                        </span>
                        <span className="flex items-center gap-1 font-bold text-[#0F4C3A]">
                          <span className="w-3 h-1 bg-[#0F4C3A] inline-block rounded-full"></span>
                          <span>실제 재고 소진 곡선</span>
                        </span>
                      </div>
                      <span className="font-mono text-slate-500">1일 차 ~ 15일 차 경과</span>
                    </div>

                    {/* SVG Chart */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="relative w-full h-32 pt-2">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
                          <line x1="0" y1="20" x2="600" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                          <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                          <line x1="0" y1="80" x2="600" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />

                          <path
                            d="M 20 88 L 60 80 L 100 72 L 140 64 L 180 55 L 220 46 L 260 38 L 300 30 L 340 24 L 380 18 L 420 14 L 460 10 L 500 8 L 540 6 L 580 5"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            strokeDasharray="6,4"
                          />

                          <path
                            d="M 20 90 L 60 78 L 100 64 L 140 52 L 180 44 L 220 36 L 260 30 L 300 24 L 340 18 L 380 15 L 420 14 L 460 14 L 500 14 L 540 14 L 580 14 L 580 100 L 20 100 Z"
                            fill="#0F4C3A"
                            fillOpacity="0.08"
                          />

                          <path
                            d="M 20 90 L 60 78 L 100 64 L 140 52 L 180 44 L 220 36 L 260 30 L 300 24 L 340 18 L 380 15 L 420 14 L 460 14 L 500 14 L 540 14 L 580 14"
                            fill="none"
                            stroke="#0F4C3A"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />

                          {[
                            { x: 20, y: 90, val: 15 },
                            { x: 60, y: 78, val: 28 },
                            { x: 100, y: 64, val: 42 },
                            { x: 140, y: 52, val: 55 },
                            { x: 180, y: 44, val: 63 },
                            { x: 220, y: 36, val: 72 },
                            { x: 260, y: 30, val: 78 },
                            { x: 300, y: 24, val: 85 },
                            { x: 340, y: 18, val: 91 },
                            { x: 380, y: 15, val: 95 },
                            { x: 420, y: 14, val: 100 },
                            { x: 460, y: 14, val: 104 },
                            { x: 500, y: 14, val: 106 },
                            { x: 540, y: 14, val: 108 },
                            { x: 580, y: 14, val: 110 }
                          ].map((pt, i) => (
                            <g key={i} className="group cursor-pointer">
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#0F4C3A" stroke="#ffffff" strokeWidth="2" />
                              <circle cx={pt.x} cy={pt.y} r="8" fill="#0F4C3A" fillOpacity="0.2" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </g>
                          ))}
                        </svg>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <span key={i} className="w-6 text-center">{i + 1}일</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Fallback Action Plan Recommendation */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>3. 사후 대처 추천 현황</span>
                  </h4>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">7일 차 목표 소진율 미달 감지 시</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                        💡 [2차 대응 전략 추천]
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs">
                      <strong>AI 추천 2차 대응안:</strong> 온라인 장바구니에 해당 품목을 담아둔 고객(약 150명) 대상 5% 추가 타겟 할인 쿠폰 제공 제안
                    </p>
                    <p className="text-emerald-700 font-medium text-[11px]">
                      ✓ 기대 효과: 2차 대응 적용 시 3일 간 약 14개 추가 결제 유입 및 잔여재고 소진 방어 예상
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  닫기
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/inventory/risk?retryItem=${selectedCase.targetItems[0]?.id}`}
                    className="px-4 py-2 bg-[#0F4C3A] hover:bg-[#0B392B] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#9E7C3B]" />
                    <span>현재 데이터로 AI 전략 다시 추천</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
