'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { getChannelInventoryBySku } from '@/lib/greenfood-channel-data';
import {
  buildStrategyCandidates,
  getDefaultStrategyControls,
  simulateStrategy,
  type StrategyCandidate,
  type StrategyControls,
  type StrategySubject,
} from '@/lib/strategy-workbench-data';
import { ArrowLeft, CheckCircle2, RotateCcw, Save, Send, Sparkles, X } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const colors = ['#0F4C3A', '#2563EB', '#D97706'];
const money = (value: number) => `${value < 0 ? '-' : ''}₩${Math.round(Math.abs(value) / 10000).toLocaleString()}만원`;

export default function StrategySimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetType = searchParams.get('targetType') === 'BUNDLE' ? 'BUNDLE' : 'SKU';
  const product = INVENTORY_PRODUCTS.find((item) => item.id === searchParams.get('productId')) ?? INVENTORY_PRODUCTS.find((item) => item.affiliate === '현대그린푸드')!;
  const sku = product.skus.find((item) => item.id === searchParams.get('skuId')) ?? product.skus[0];
  const channelRows = getChannelInventoryBySku(sku.id);
  const subject: StrategySubject = targetType === 'BUNDLE'
    ? { targetType: 'BUNDLE', code: searchParams.get('bundleCode') ?? 'BND-20260806-001', name: '그리팅 추천 번들 초안', category: '번들상품', affiliate: '현대그린푸드', inventoryQty: 45, unit: '세트', sellingPrice: 49900, forecast14Days: 31, expiryDays: 18 }
    : { targetType: 'SKU', code: sku.code, name: `${product.name} · ${sku.optionLabel}`, category: product.category, affiliate: product.affiliate, inventoryQty: channelRows.reduce((sum, row) => sum + row.availableStock, 0) || sku.availableStock, unit: sku.unit, sellingPrice: sku.sellingPrice, forecast14Days: channelRows.reduce((sum, row) => sum + row.forecast14Days, 0) || Math.round(sku.salesVelocity * 14), expiryDays: Number(sku.expiryLabel.match(/\d+/)?.[0] ?? 31) };
  const allCandidates = useMemo(() => buildStrategyCandidates(subject), [subject.code, subject.inventoryQty, subject.sellingPrice, subject.targetType]);
  const requestedIds = (searchParams.get('options') ?? '').split(',').filter(Boolean);
  const requestedCandidates = requestedIds
    .map((id) => allCandidates.find((item) => item.id === id))
    .filter((item): item is StrategyCandidate => item !== undefined);
  const selectedCandidates = requestedCandidates.length > 0 ? requestedCandidates : allCandidates.slice(0, 3);
  const [activeId, setActiveId] = useState(() => selectedCandidates[0]?.id ?? '');
  const [finalId, setFinalId] = useState('');
  const [controls, setControls] = useState<Record<string, StrategyControls>>(() => Object.fromEntries(selectedCandidates.map((item) => [item.id, getDefaultStrategyControls(item)])));
  const [chartMode, setChartMode] = useState<'INVENTORY' | 'PROFIT'>('INVENTORY');
  const [saved, setSaved] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewer, setReviewer] = useState('김영만 수석 MD · 재고전략팀');
  const [teamsChannel, setTeamsChannel] = useState('재고전략-통합운영');
  const [startDate, setStartDate] = useState('2026-08-07');
  const active = selectedCandidates.find((item) => item.id === activeId) ?? selectedCandidates[0];
  const activeControls = controls[active.id] ?? getDefaultStrategyControls(active);
  const results = selectedCandidates.map((candidate) => ({ candidate, controls: controls[candidate.id] ?? getDefaultStrategyControls(candidate), result: simulateStrategy(subject, candidate, controls[candidate.id] ?? getDefaultStrategyControls(candidate)) }));
  const activeResult = results.find((item) => item.candidate.id === active.id)!.result;
  const originalControls = getDefaultStrategyControls(active);
  const originalResult = simulateStrategy(subject, active, originalControls);

  const updateControl = <K extends keyof StrategyControls>(key: K, value: StrategyControls[K]) => {
    setSaved(false);
    setControls((current) => ({ ...current, [active.id]: { ...activeControls, [key]: value } }));
  };
  const resetActive = () => setControls((current) => ({ ...current, [active.id]: getDefaultStrategyControls(active) }));

  const chartData = [0, 7, 14, 21, 28].map((day) => {
    const point: Record<string, string | number> = { day: `${day}일` };
    results.forEach(({ candidate, controls: itemControls, result }) => {
      const ratio = Math.min(1, day / Math.max(1, itemControls.campaignDays));
      point[candidate.id] = chartMode === 'INVENTORY'
        ? Math.max(0, Math.round(subject.inventoryQty - result.expectedSales * ratio))
        : Math.round(result.contributionProfit * ratio / 10000);
    });
    return point;
  });

  const endDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + activeControls.campaignDays - 1);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }, [activeControls.campaignDays, startDate]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-28">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />AI 추천 전략 비교로 돌아가기</button><h1 className="mt-3 text-2xl font-black text-slate-950">전략 비교 시뮬레이션</h1><p className="mt-1 text-xs text-slate-500">{subject.code} · {subject.name} · 현재 재고 {subject.inventoryQty}{subject.unit}</p></div>
          <div className="flex gap-2"><button type="button" onClick={resetActive} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />추천값 복원</button><button type="button" onClick={() => setSaved(true)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><Save className="mr-1 inline h-3.5 w-3.5" />조정안 저장</button></div>
        </header>

        {saved && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />현재 조정안이 전략 초안으로 저장되었습니다.</div>}
        {reviewSent && <div className="flex items-center gap-2 rounded-xl border border-[#6264A7]/30 bg-[#F7F7FC] px-4 py-3 text-xs font-bold text-[#4B4D8F]"><CheckCircle2 className="h-4 w-4" />#{teamsChannel} 채널로 {reviewer}에게 최종안 검토를 요청했습니다.</div>}

        <section className="grid gap-3 md:grid-cols-3">
          {selectedCandidates.map((candidate, index) => {
            const selected = candidate.id === active.id;
            return <button key={candidate.id} type="button" onClick={() => setActiveId(candidate.id)} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-[#0F4C3A] bg-emerald-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-500">전략 {index + 1}</span><label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500" onClick={(event) => event.stopPropagation()}><input type="radio" name="final-strategy" checked={finalId === candidate.id} onChange={() => setFinalId(candidate.id)} className="accent-[#0F4C3A]" />최종안</label></div><p className="mt-2 text-sm font-black text-slate-950">{candidate.title}</p><p className="mt-2 text-[10px] text-slate-500">{candidate.goal === 'FAST' ? '빠른 완판' : candidate.goal === 'MARGIN' ? '마진 극대화' : '최대 매출'}</p></button>;
          })}
        </section>

        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-black text-slate-950">조건 조정</h2><p className="mt-1 text-[10px] text-slate-500">{active.title}</p></div>
            <div className="space-y-5 p-5">
              <RangeControl label="적용 상품수량" value={activeControls.appliedQuantity} suffix={subject.unit} min={1} max={subject.inventoryQty} onChange={(value) => updateControl('appliedQuantity', value)} />
              <RangeControl label="할인율" value={activeControls.discountRate} suffix="%" min={0} max={50} onChange={(value) => updateControl('discountRate', value)} />
              <div><p className="text-[11px] font-bold text-slate-600">판매기간</p><div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-300 px-2 text-[10px] font-bold" /><span className="text-slate-400">–</span><input type="date" value={endDate} onChange={(event) => { const end = new Date(event.target.value); const start = new Date(startDate); updateControl('campaignDays', Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)); }} className="h-9 min-w-0 rounded-lg border border-slate-300 px-2 text-[10px] font-bold" /></div></div>
              <label className="block"><span className="text-[11px] font-bold text-slate-600">추가 혜택 비율</span><div className="relative mt-2"><input type="number" min="0" max="20" value={activeControls.benefitRate} onChange={(event) => updateControl('benefitRate', Math.min(20, Math.max(0, Number(event.target.value))))} className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-8 text-right text-xs font-black" /><span className="absolute right-3 top-3 text-xs text-slate-500">%</span></div></label>
              <label className="block"><span className="text-[11px] font-bold text-slate-600">프로모션 비용</span><div className="relative mt-2"><input type="number" min="0" step="10000" value={activeControls.promotionCost} onChange={(event) => updateControl('promotionCost', Math.max(0, Number(event.target.value)))} className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-8 text-right text-xs font-black" /><span className="absolute right-3 top-3 text-[10px] text-slate-500">원</span></div></label>
              <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-3 text-xs font-bold text-slate-700">무료배송 지원<input type="checkbox" checked={activeControls.freeShipping} onChange={(event) => updateControl('freeShipping', event.target.checked)} className="h-4 w-4 accent-[#0F4C3A]" /></label>
              {activeResult.contributionProfit < 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10px] font-semibold leading-4 text-rose-800">현재 조건은 음수 공헌이익입니다. 손실 {money(activeResult.contributionProfit)}을 0으로 보정하지 않고 최종 결과에 반영합니다.</div>}
            </div>
          </aside>

          <main className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-black text-slate-950">시뮬레이션 차트</h2><p className="mt-1 text-[10px] text-slate-500">선택한 전략의 28일 예상 변화 추이</p></div><div className="flex rounded-lg border border-slate-200 p-1">{([['INVENTORY', '재고 추이'], ['PROFIT', '매출·이익']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setChartMode(id)} className={`rounded-md px-3 py-2 text-[10px] font-bold ${chartMode === id ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{label}</button>)}</div></div>
              <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend />{selectedCandidates.map((candidate, index) => <Line key={candidate.id} type="monotone" dataKey={candidate.id} name={candidate.title} stroke={colors[index]} strokeWidth={3} dot={false} />)}</LineChart></ResponsiveContainer></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">현재 전략 예상 결과 · {active.title}</h2><div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-[11px]"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3 text-left">결과 항목</th><th className="px-4 py-3 text-right">AI 추천값</th><th className="px-4 py-3 text-right">현재 조정값</th></tr></thead><tbody>{[
                ['예상 판매량', `${originalResult.expectedSales}${subject.unit}`, `${activeResult.expectedSales}${subject.unit}`],
                ['예상 매출', money(originalResult.expectedRevenue), money(activeResult.expectedRevenue)],
                ['예상 공헌이익', money(originalResult.contributionProfit), money(activeResult.contributionProfit)],
                ['예상 공헌이익률', `${originalResult.contributionMarginRate}%`, `${activeResult.contributionMarginRate}%`],
                ['예상 재고 소진기간', `${originalResult.liquidationDays}일`, `${activeResult.liquidationDays}일`],
                ['행사 후 예상 잔여재고', `${originalResult.remainingQty}${subject.unit}`, `${activeResult.remainingQty}${subject.unit}`],
              ].map(([label, original, adjusted]) => <tr key={label} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-600">{label}</td><td className="px-4 py-3 text-right text-slate-500">{original}</td><td className={`px-4 py-3 text-right font-black ${label.includes('공헌이익') && activeResult.contributionProfit < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{adjusted}</td></tr>)}</tbody></table></div></section>
          </main>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur md:left-64"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div><p className="text-xs font-black text-slate-900">Teams로 보낼 최종안을 선택해주세요.</p><p className="mt-1 text-[10px] text-slate-500">비교한 전략 중 하나를 최종안으로 지정해야 검토를 요청할 수 있습니다.</p></div><div className="flex gap-2"><button type="button" onClick={() => finalId && setSaved(true)} disabled={!finalId} className="rounded-xl border border-slate-400 bg-white px-5 py-3 text-xs font-black text-slate-800 disabled:opacity-40"><Sparkles className="mr-1 inline h-4 w-4" />AI 최종 검토</button><button type="button" onClick={() => setReviewOpen(true)} disabled={!finalId} className="rounded-xl bg-[#0F4C3A] px-6 py-3 text-xs font-black text-white disabled:bg-slate-300"><Send className="mr-1 inline h-4 w-4" />Teams 검토 요청</button></div></div></footer>

        {reviewOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="review-title" className="text-lg font-black text-slate-950">Microsoft Teams 검토 요청</h2><p className="mt-1 text-xs text-slate-500">선택한 최종 전략과 조정 결과를 담당자에게 전달합니다.</p></div><button type="button" onClick={() => setReviewOpen(false)} aria-label="검토 요청 닫기"><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 space-y-4"><label className="block text-xs font-bold text-slate-600">검토 담당자<select value={reviewer} onChange={(event) => setReviewer(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold"><option>김영만 수석 MD · 재고전략팀</option><option>박서연 수석 MD · 식품관 운영팀</option></select></label><label className="block text-xs font-bold text-slate-600">Teams 채널<select value={teamsChannel} onChange={(event) => setTeamsChannel(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold"><option>재고전략-통합운영</option><option>그리팅몰-MD</option><option>백화점 식품관-재고운영</option></select></label><div className="rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-700"><strong>{selectedCandidates.find((item) => item.id === finalId)?.title}</strong><br />예상 판매 {results.find((item) => item.candidate.id === finalId)?.result.expectedSales}{subject.unit} · 공헌이익 {money(results.find((item) => item.candidate.id === finalId)?.result.contributionProfit ?? 0)}</div></div><button type="button" onClick={() => { setReviewOpen(false); setReviewSent(true); setSaved(true); }} className="mt-5 w-full rounded-xl bg-[#6264A7] py-3 text-xs font-black text-white">Teams로 검토 요청 보내기</button></div></div>}
      </div>
    </AppLayout>
  );
}

function RangeControl({ label, value, suffix, min, max, onChange }: { label: string; value: number; suffix: string; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-center justify-between text-[11px] font-bold text-slate-600"><span>{label}</span><strong className="text-sm text-slate-900">{value}{suffix}</strong></div><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-[#0F4C3A]" /></label>;
}
