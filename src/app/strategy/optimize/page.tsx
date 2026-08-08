'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { getChannelInventoryBySku } from '@/lib/greenfood-channel-data';
import {
  buildStrategyCandidates,
  getDefaultStrategyControls,
  GOAL_META,
  simulateStrategy,
  type StrategyCandidate,
  type StrategyGoal,
  type StrategySubject,
} from '@/lib/strategy-workbench-data';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Layers3, Sparkles } from 'lucide-react';

const goals: StrategyGoal[] = ['FAST', 'MARGIN', 'REVENUE'];
const wizardSteps = [
  { label: '분석 조건', description: '대상과 재고 확인' },
  { label: '전략 비교 및 선택', description: '목표별 9개 전략 비교' },
  { label: '선택 전략 최종 확인', description: '시나리오 확정' },
];
const money = (value: number) => `${value < 0 ? '-' : ''}₩${Math.round(Math.abs(value) / 10000).toLocaleString()}만원`;

function StrategyOptimizeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetType = searchParams.get('targetType') === 'BUNDLE' ? 'BUNDLE' : 'SKU';
  const selectedProduct = INVENTORY_PRODUCTS.find((product) => product.id === searchParams.get('productId'))
    ?? INVENTORY_PRODUCTS.find((product) => product.affiliate === '현대그린푸드')!;
  const selectedSku = selectedProduct.skus.find((sku) => sku.id === searchParams.get('skuId')) ?? selectedProduct.skus[0];
  const channelRows = getChannelInventoryBySku(selectedSku.id);
  const subject: StrategySubject = targetType === 'BUNDLE'
    ? { targetType: 'BUNDLE', code: searchParams.get('bundleCode') ?? 'BND-20260806-001', name: '그리팅 추천 번들 초안', category: '번들상품', affiliate: '현대그린푸드', inventoryQty: 45, unit: '세트', sellingPrice: 49900, forecast14Days: 31, expiryDays: 18 }
    : { targetType: 'SKU', code: selectedSku.code, name: `${selectedProduct.name} · ${selectedSku.optionLabel}`, category: selectedProduct.category, affiliate: selectedProduct.affiliate, inventoryQty: channelRows.reduce((sum, row) => sum + row.availableStock, 0) || selectedSku.availableStock, unit: selectedSku.unit, sellingPrice: selectedSku.sellingPrice, forecast14Days: channelRows.reduce((sum, row) => sum + row.forecast14Days, 0) || Math.round(selectedSku.salesVelocity * 14), expiryDays: Number(selectedSku.expiryLabel.match(/\d+/)?.[0] ?? 31) };
  const candidates = useMemo(() => buildStrategyCandidates(subject), [subject.code, subject.inventoryQty, subject.sellingPrice, subject.targetType]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const selectedCandidates = selectedIds.map((id) => candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is StrategyCandidate => candidate !== undefined);

  const toggleCandidate = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  };

  const openSimulation = () => {
    if (!selectedIds.length) return;
    const query = new URLSearchParams({ options: selectedIds.join(','), targetType: subject.targetType, ...(subject.targetType === 'BUNDLE' ? { bundleCode: subject.code } : { productId: selectedProduct.id, skuId: selectedSku.id }) });
    router.push(`/strategy/CASE-2026-001/simulate?${query.toString()}`);
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-28">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#9E7C3B]" /><span className="text-xs font-black text-[#0F4C3A]">AI STRATEGY WIZARD</span></div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">현대그린푸드 AI 추천 전략 단계별 선택</h1>
          </div>
          <p className="max-w-xl text-right text-xs leading-5 text-slate-500">9개 전략을 목표별 3개씩 확인하고 시뮬레이션할 전략을 최대 3개 선택합니다.</p>
        </header>

        <nav aria-label="전략 선택 단계" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ol className="grid grid-cols-3">
            {wizardSteps.map((step, index) => {
              const completed = index < currentStep;
              const active = index === currentStep;
              return <li key={step.label} className="relative min-w-0">
                {index < wizardSteps.length - 1 && <span className={`absolute left-[calc(50%+20px)] right-[-50%] top-4 h-0.5 ${index < currentStep ? 'bg-[#0F4C3A]' : 'bg-slate-200'}`} />}
                <button type="button" onClick={() => setCurrentStep(index)} className="relative z-10 flex w-full flex-col items-center px-1 text-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black ${active ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white ring-4 ring-emerald-100' : completed ? 'border-[#0F4C3A] bg-white text-[#0F4C3A]' : 'border-slate-200 bg-white text-slate-400'}`}>{completed ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <strong className={`mt-2 truncate text-[11px] ${active || completed ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</strong>
                  <span className="mt-0.5 hidden truncate text-[9px] text-slate-400 md:block">{step.description}</span>
                </button>
              </li>;
            })}
          </ol>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div><p className="text-xs font-black text-[#0F4C3A]">비교함 {selectedIds.length}/3</p><p className="mt-0.5 text-[10px] text-slate-500">각 목표에서 원하는 전략을 선택하면 마지막 단계에서 한 번에 확인할 수 있습니다.</p></div>
          <div className="flex flex-wrap gap-2">{selectedCandidates.length ? selectedCandidates.map((candidate) => <span key={candidate.id} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700">{GOAL_META[candidate.goal].label} · {candidate.rank}안</span>) : <span className="text-[10px] font-semibold text-slate-400">선택된 전략 없음</span>}</div>
        </div>

        {currentStep === 0 && <AnalysisStep subject={subject} />}

        {currentStep === 1 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black text-[#0F4C3A]">STEP 2 OF 3</p><h2 className="mt-1 text-xl font-black text-slate-950">AI 추천 전략 9개 비교 및 선택</h2><p className="mt-1 text-xs text-slate-500">세 가지 목표별 추천안을 한 화면에서 비교하고 시뮬레이션할 전략을 선택합니다.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">전체 전략 중 최대 3개 선택</span></div>
            <div className="grid items-start gap-4 xl:grid-cols-3">
              {goals.map((goal) => (
                <div key={goal} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
                  <div className="flex min-h-20 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{GOAL_META[goal].label}</h3>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">{GOAL_META[goal].description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-[#0F4C3A]">
                      선택 {candidates.filter((candidate) => candidate.goal === goal && selectedIds.includes(candidate.id)).length}개
                    </span>
                  </div>
                  <div className="grid gap-3 p-4">
                    {candidates
                      .filter((candidate) => candidate.goal === goal)
                      .map((candidate) => (
                        <StrategyCard
                          key={candidate.id}
                          candidate={candidate}
                          subject={subject}
                          selected={selectedIds.includes(candidate.id)}
                          disabled={!selectedIds.includes(candidate.id) && selectedIds.length >= 3}
                          onToggle={() => toggleCandidate(candidate.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section className="space-y-4">
            <div><p className="text-[10px] font-black text-[#0F4C3A]">STEP 3 OF 3</p><h2 className="mt-1 text-xl font-black text-slate-950">선택 전략 최종 확인</h2><p className="mt-1 text-xs text-slate-500">선택한 전략을 시나리오 후보로 확정하고 조건 조정·성과 예측 단계로 이동합니다.</p></div>
            {selectedCandidates.length ? <div className="grid gap-4 lg:grid-cols-3">{selectedCandidates.map((candidate) => <StrategyCard key={candidate.id} candidate={candidate} subject={subject} selected disabled={false} onToggle={() => toggleCandidate(candidate.id)} summary />)}</div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><ClipboardCheck className="h-10 w-10 text-slate-300" /><p className="mt-4 text-sm font-black text-slate-700">선택한 전략이 없습니다.</p><p className="mt-1 text-xs text-slate-500">전략 비교 단계로 이동해 최소 1개 전략을 선택해주세요.</p><Button onClick={() => setCurrentStep(1)} size="sm" className="mt-4">전략 비교 및 선택으로 이동</Button></div>}
          </section>
        )}

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div><p className="text-xs font-black text-slate-900">{wizardSteps[currentStep].label}</p><p className="mt-1 text-[10px] text-slate-500">{currentStep + 1}/3 단계 · 비교함 {selectedIds.length}/3</p></div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0} leftIcon={<ArrowLeft />} className="rounded-xl">이전</Button>
              {currentStep < 2 ? <Button type="button" onClick={() => setCurrentStep((step) => Math.min(2, step + 1))} rightIcon={<ArrowRight />} className="min-w-36 rounded-xl">다음 단계</Button> : <Button type="button" onClick={openSimulation} disabled={!selectedIds.length} leftIcon={<Layers3 />} rightIcon={<ArrowRight />} className="min-w-64 rounded-xl">선택 전략 비교·시뮬레이션</Button>}
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}

function AnalysisStep({ subject }: { subject: StrategySubject }) {
  return <section className="space-y-4"><div><p className="text-[10px] font-black text-[#0F4C3A]">STEP 1 OF 3</p><h2 className="mt-1 text-xl font-black text-slate-950">분석 대상과 조건을 확인해주세요.</h2><p className="mt-1 text-xs text-slate-500">추천 전략은 아래 재고·수요·판매 가능 기간을 기준으로 생성되었습니다.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1.3fr]"><InfoBox label="분석 대상" value={subject.name} /><InfoBox label="분석 LOT" value="전체 LOT" /><InfoBox label="예측 기간" value="향후 14일" /><InfoBox label="우선 목표" value="빠른 완판" /><div><p className="text-[10px] font-bold text-slate-500">이동·판매 대상 채널</p><div className="mt-2 flex flex-wrap gap-2">{['백화점 식품관', '그리팅몰', '센터 공용'].map((item) => <span key={item} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-800">{item}</span>)}</div></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="통합 현재고" value={`${subject.inventoryQty.toLocaleString()}${subject.unit}`} /><Metric label="14일 예상 수요" value={`${subject.forecast14Days.toLocaleString()}${subject.unit}`} /><Metric label="위험 예상 잔여재고" value={`${Math.max(0, subject.inventoryQty - subject.forecast14Days).toLocaleString()}${subject.unit}`} /><Metric label="판매 가능 잔여일" value={`${subject.expiryDays}일`} /></div></div></section>;
}

function StrategyCard({ candidate, subject, selected, disabled, onToggle, summary = false }: { candidate: StrategyCandidate; subject: StrategySubject; selected: boolean; disabled: boolean; onToggle: () => void; summary?: boolean }) {
  const result = simulateStrategy(subject, candidate, getDefaultStrategyControls(candidate));
  return <article className={`relative rounded-2xl border p-5 shadow-sm transition ${selected ? 'border-[#0F4C3A] bg-emerald-50/60 ring-1 ring-[#0F4C3A]/10' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">{candidate.rank}안</span>{candidate.rank === 1 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800">AI 추천</span>}</div><button type="button" disabled={disabled} onClick={onToggle} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-black ${selected ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white' : 'border-slate-300 bg-white text-slate-600'} disabled:cursor-not-allowed`}><Check className="h-3.5 w-3.5" />{selected ? summary ? '선택 해제' : '비교함 포함' : '선택'}</button></div>
    <span className="mt-4 inline-block rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-700">{candidate.badge}</span><h3 className="mt-3 text-sm font-black leading-5 text-slate-950">{candidate.title}</h3><p className="mt-2 min-h-8 text-[10px] leading-4 text-slate-500">{candidate.channels}</p>
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/90 p-3 text-[10px]"><div><p className="text-slate-500">예상 판매</p><strong className="mt-1 block text-base text-slate-900">{result.expectedSales}{subject.unit}</strong><p className="mt-1 text-slate-500">매출 {money(result.expectedRevenue)}</p></div><div><p className="text-slate-500">소진율</p><strong className="mt-1 block text-base text-slate-900">{result.sellThroughRate}%</strong><p className={`mt-1 font-bold ${result.contributionProfit < 0 ? 'text-rose-700' : 'text-[#0F4C3A]'}`}>이익 {money(result.contributionProfit)}</p></div></div>
    <div className="mt-4 space-y-1 text-[10px] leading-4"><p className="text-slate-700">+ {candidate.benefit}</p><p className="text-slate-500">△ {candidate.risk}</p></div>
  </article>;
}

function InfoBox({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold text-slate-500">{label}</p><div className="mt-2 flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900">{value}</div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-100 p-4"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-black tabular-nums text-slate-950">{value}</p></div>; }

export default function StrategyOptimizePage() { return <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">추천 전략을 준비하고 있습니다.</div>}><StrategyOptimizeContent /></Suspense>; }
