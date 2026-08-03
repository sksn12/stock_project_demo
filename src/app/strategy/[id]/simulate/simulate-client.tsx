'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { MOCK_OPTIMIZATION_CASES } from '@/lib/mock-data';
import { INVENTORY_PRODUCTS, SKU_OPERATION_DATA } from '@/lib/inventory-control-data';
import {
  buildSimulationFallback,
  getDefaultControls,
  getSimulationOption,
  simulateOption,
  SimulationControls,
  SimulationOption,
} from '@/lib/simulation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  RotateCcw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Send,
  MessageSquare,
  UserCheck,
  Calendar,
  X,
  Share2,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const formatMoney = (value: number) => `₩${Math.round(value / 10000).toLocaleString()}만원`;
const formatWon = (value: number) => `₩${Math.round(value).toLocaleString()}`;

const toneClasses = {
  normal: { card: 'border-emerald-200 bg-emerald-50/70', badge: 'border-emerald-200 bg-emerald-100 text-emerald-800' },
  watch: { card: 'border-sky-200 bg-sky-50/70', badge: 'border-sky-200 bg-sky-100 text-sky-800' },
  adjust: { card: 'border-[#9E7C3B]/30 bg-amber-50/70', badge: 'border-amber-200 bg-amber-100 text-amber-800' },
  urgent: { card: 'border-orange-200 bg-orange-50/70', badge: 'border-orange-200 bg-orange-100 text-orange-800' },
  protect: { card: 'border-red-200 bg-red-50/70', badge: 'border-red-200 bg-red-100 text-red-800' },
} as const;

export default function StrategySimulationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = (params?.id as string) || 'CASE-2026-001';
  const caseData = useMemo(() => MOCK_OPTIMIZATION_CASES.find((item) => item.id === caseId) || MOCK_OPTIMIZATION_CASES[0], [caseId]);
  const selectedProduct = useMemo(() => INVENTORY_PRODUCTS.find((product) => product.id === searchParams.get('productId')), [searchParams]);
  const selectedSku = useMemo(() => selectedProduct?.skus.find((sku) => sku.id === searchParams.get('skuId')), [searchParams, selectedProduct]);

  const selectedIds = useMemo(() => {
    const queryIds = (searchParams.get('options') || '').split(',').filter(Boolean);
    const validOptions = queryIds.map((id) => getSimulationOption(id)).filter(Boolean) as SimulationOption[];
    return validOptions.length ? validOptions.map((option) => option.id) : ['OPT-PROFIT-1'];
  }, [searchParams]);

  const selectedOptions = useMemo(() => selectedIds
    .map((id) => getSimulationOption(id))
    .filter(Boolean)
    .map((option) => {
      if (!selectedSku) return option as SimulationOption;
      const stockRatio = selectedSku.availableStock / Math.max(1, option!.inventoryQty);
      return {
        ...option!,
        inventoryQty: selectedSku.availableStock,
        sellingPrice: selectedSku.sellingPrice,
        costPrice: Math.round(selectedSku.sellingPrice * 0.58),
        expectedSalesQty: Math.min(selectedSku.availableStock, Math.max(1, Math.round(option!.expectedSalesQty * stockRatio))),
      };
    }) as SimulationOption[], [selectedIds, selectedSku]);
  const [activeOptionId, setActiveOptionId] = useState(selectedIds[0]);
  const initialControls = useMemo(() => Object.fromEntries(selectedOptions.map((option) => [option.id, getDefaultControls(option)])), [selectedOptions]);
  const [controlsByOption, setControlsByOption] = useState<Record<string, SimulationControls>>(initialControls);
  const [saved, setSaved] = useState(false);
  const [approved, setApproved] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [isHmallPreviewOpen, setIsHmallPreviewOpen] = useState(false);

  // 검토 요청 모달 관련 상태
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'TEAMS' | 'SLACK'>('TEAMS');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('김영만 수석 MD (현대백화점 본사 재고전략팀)');
  const [dueDate, setDueDate] = useState<string>('2026-07-27');
  const [customNote, setCustomNote] = useState<string>('');

  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeOption = selectedOptions.find((option) => option.id === activeOptionId) || selectedOptions[0];
  const activeControls = controlsByOption[activeOption.id] || getDefaultControls(activeOption);
  const results = useMemo(() => selectedOptions.map((option) => ({ option, controls: controlsByOption[option.id] || getDefaultControls(option), result: simulateOption(option, controlsByOption[option.id] || getDefaultControls(option)) })), [controlsByOption, selectedOptions]);
  const activeResult = results.find((item) => item.option.id === activeOption.id)?.result || simulateOption(activeOption, activeControls);
  const previewProduct = selectedProduct ?? INVENTORY_PRODUCTS[0];
  const previewSku = selectedSku ?? previewProduct.skus[0];
  const previewImage = SKU_OPERATION_DATA[previewSku.id]?.imageUrl ?? previewProduct.imageUrl;
  const discountedPrice = Math.max(0, Math.round(previewSku.sellingPrice * (1 - activeControls.discountRate / 100)));
  const couponPrice = Math.max(0, Math.round(discountedPrice * (1 - activeControls.couponRate / 100)));

  const updateControl = <K extends keyof SimulationControls>(key: K, value: SimulationControls[K]) => {
    setSaved(false);
    setControlsByOption((current) => ({
      ...current,
      [activeOption.id]: { ...(current[activeOption.id] || getDefaultControls(activeOption)), [key]: value },
    }));
  };

  const resetActive = () => {
    setSaved(false);
    setControlsByOption((current) => ({ ...current, [activeOption.id]: getDefaultControls(activeOption) }));
  };

  const chartData = useMemo(() => {
    const baseRates = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50];
    const rates = Array.from(new Set([...baseRates, activeControls.discountRate])).sort((a, b) => a - b);
    return rates.map((rate) => {
      const point: Record<string, number | string> = { discountRate: `${rate}%` };
      selectedOptions.forEach((option) => {
        const controls = controlsByOption[option.id] || getDefaultControls(option);
        const preview = simulateOption(option, { ...controls, discountRate: rate });
        point[`margin_${option.id}`] = Math.round(preview.incrementalContribution / 10000);
        point[`sales_${option.id}`] = preview.expectedSalesQty;
      });
      return point;
    });
  }, [activeControls.discountRate, controlsByOption, selectedOptions]);

  const colors: Record<string, string> = {
    'OPT-PROFIT-1': '#0F4C3A', 'OPT-PROFIT-2': '#059669', 'OPT-PROFIT-3': '#10B981',
    'OPT-FAST-1': '#D97706', 'OPT-FAST-2': '#F59E0B', 'OPT-REV-1': '#2563EB', 'OPT-REV-2': '#3B82F6',
  };
  const fallbackSteps = buildSimulationFallback(activeOption, activeControls, activeResult);
  const costRows = [
    ['고객 결제 매출', activeResult.expectedRevenue],
    ['상품 할인 비용', -activeResult.discountCost],
    ['쿠폰·포인트 비용', -(activeResult.couponCost + activeResult.pointCost)],
    ['배송·플랫폼 비용', -(activeResult.shippingCost + activeResult.platformFee)],
    ['피킹·포장·번들 운영비', -activeResult.operationCost],
    ['반품·환불 예상 비용', -activeResult.returnCost],
    ['보관 비용', -activeResult.storageCost],
    ['회피되는 폐기 비용', activeResult.avoidedDisposalCost],
  ];

  const handleSendProposal = () => {
    const channelName = selectedChannel === 'TEAMS' ? 'Microsoft Teams' : 'Slack';
    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    setApproved(true);
    setSentNotice(`${channelName} 채널을 통해 [${selectedReviewer}] 님께 시뮬레이션 조정안 검토 요청 메시지가 전송되었습니다. (${timestamp})`);
    setIsReviewModalOpen(false);
  };

  const REVIEWERS = [
    '김영만 수석 MD (현대백화점 본사 재고전략팀)',
    '김민준 책임 MD (더현대 서울 2F 여성패션)',
    '박서연 수석 MD (더현대 서울 B1 식품관)',
    '최현우 팀장 (더현대 서울 3F 남성잡화)'
  ];

  return (
    <AppLayout>
      <div className="simulation-workbench space-y-5 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> 전략 카드 목록으로 돌아가기
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsHmallPreviewOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F4C3A]/25 bg-white px-3 py-2 text-xs font-bold text-[#0F4C3A] hover:bg-emerald-50 cursor-pointer">
              <Eye className="h-3.5 w-3.5" /> Hmall 판매화면 미리보기
            </button>
            <button onClick={resetActive} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> AI 추천값으로 복원
            </button>
            <button onClick={() => { setSaved(true); setApproved(false); }} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F4C3A] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0B392B] cursor-pointer">
              <Save className="h-3.5 w-3.5" /> 사용자 조정안 저장
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-[#0F4C3A]">그룹 통합재고 시뮬레이션 워크벤치</span>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{selectedProduct && selectedSku ? `${selectedProduct.affiliate} ${selectedProduct.name} · ${selectedSku.optionLabel}` : caseData.title}</h1>
              <p className="mt-1 text-xs text-slate-500">AI 추천 원본을 기준으로 조건을 조정하고, 비교함에 담긴 전략의 비용·판매·잔여재고 결과를 비교합니다.</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>데이터 기준: 2026.08.02 · 통합 판매·재고 데이터</p>
              <p className="mt-1 font-semibold text-[#0F4C3A]">실제 가격·쿠폰·재고는 변경되지 않습니다.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-3">
            {selectedOptions.map((option) => {
              const item = results.find((entry) => entry.option.id === option.id);
              const isActive = option.id === activeOption.id;
              return (
                <button key={option.id} type="button" onClick={() => setActiveOptionId(option.id)} className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${isActive ? 'border-[#0F4C3A] bg-emerald-50/70 shadow-sm ring-1 ring-[#0F4C3A]/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold" style={{ color: colors[option.id] }}>{option.categoryLabel}</span>
                    {isActive && <span className="rounded bg-[#0F4C3A] px-1.5 py-0.5 text-[10px] font-bold text-white">조정 중</span>}
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-slate-900">{option.name}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>할인 {item?.controls.discountRate}%</span>
                    <span className="font-bold text-[#0F4C3A]">{formatMoney(item?.result.incrementalContribution || option.expectedNetContributionMargin)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-500">데이터 신선도</span><span className="float-right font-bold text-slate-800">2026.07.24 10:15</span></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-500">데이터 완전성</span><span className="float-right font-bold text-[#0F4C3A]">94% · 보통 이상</span></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-500">참고 가중치</span><span className="float-right font-bold text-slate-800">동일 65% · 유사 25% · 시즌 10%</span></div>
          </div>
        </section>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 사용자 조정안이 초안으로 저장되었습니다. 승인 전에는 실제 실행되지 않습니다.
          </div>
        )}

        {sentNotice && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-100 p-4 text-xs font-bold text-emerald-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
              <span>{sentNotice}</span>
            </div>
            <button onClick={() => setSentNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-xs xl:sticky xl:top-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-[#0F4C3A]" /> 조건 세밀 조정</p>
                <p className="mt-1 text-[11px] text-slate-500">{activeOption.rankLabel} · {activeOption.targetChannel}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-[#9E7C3B]">더미 시뮬레이션</span>
            </div>

            <div className="space-y-4 pt-4">
              <label className="block">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700"><span>상품 할인율</span><span className="font-mono text-[#0F4C3A]">{activeControls.discountRate}%</span></div>
                <input aria-label="상품 할인율" type="range" min="0" max="50" step="1" value={activeControls.discountRate} onChange={(event) => updateControl('discountRate', Number(event.target.value))} className="mt-2 w-full accent-[#0F4C3A]" />
                <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-800"><span>0%</span><span>권장 {activeOption.discountRate}%</span><span>50%</span></div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-[11px] font-semibold text-slate-600">쿠폰 부담률</span><div className="relative mt-1"><input aria-label="쿠폰 부담률" type="number" min="0" max="30" step="1" value={activeControls.couponRate} onChange={(event) => updateControl('couponRate', Math.min(30, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-7 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>
                <label className="block"><span className="text-[11px] font-semibold text-slate-600">H.Point 적립률</span><div className="relative mt-1"><input aria-label="H.Point 적립률" type="number" min="0" max="15" step="1" value={activeControls.pointRate} onChange={(event) => updateControl('pointRate', Math.min(15, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-7 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#0F4C3A]" />무료배송 지원</span><input type="checkbox" checked={activeControls.freeShipping} onChange={(event) => updateControl('freeShipping', event.target.checked)} className="h-4 w-4 accent-[#0F4C3A]" /></label>
                <label className={`mt-3 block ${activeControls.freeShipping ? '' : 'opacity-50'}`}><span className="text-[11px] font-semibold text-slate-600">건당 배송비 부담</span><div className="relative mt-1"><input aria-label="건당 배송비 부담" disabled={!activeControls.freeShipping} type="number" min="0" max="20000" step="500" value={activeControls.shippingSubsidy} onChange={(event) => updateControl('shippingSubsidy', Math.min(20000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-[11px] font-semibold text-slate-600">프로모션 기간</span><div className="relative mt-1"><input aria-label="프로모션 기간" type="number" min="1" max="60" step="1" value={activeControls.campaignDays} onChange={(event) => updateControl('campaignDays', Math.min(60, Math.max(1, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>일</span></div></label>
                <label className="block"><span className="text-[11px] font-semibold text-slate-600">적용 수량</span><div className="relative mt-1"><input aria-label="적용 수량" type="number" min="1" max={activeOption.inventoryQty} step="1" value={activeControls.appliedQuantity} onChange={(event) => updateControl('appliedQuantity', Math.min(activeOption.inventoryQty, Math.max(1, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>개</span></div></label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold text-slate-700"><span>번들 판매 구성</span><input type="checkbox" checked={activeControls.bundleEnabled} onChange={(event) => updateControl('bundleEnabled', event.target.checked)} className="h-4 w-4 accent-[#0F4C3A]" /></label>
                {activeControls.bundleEnabled && <label className="mt-3 block"><span className="text-[11px] font-semibold text-slate-600">번들 추가 할인율</span><div className="relative mt-1"><input aria-label="번들 추가 할인율" type="number" min="0" max="25" step="1" value={activeControls.bundleDiscountRate} onChange={(event) => updateControl('bundleDiscountRate', Math.min(25, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 pr-7 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white">
                <button type="button" onClick={() => setShowAdvanced((current) => !current)} className="flex w-full items-center justify-between px-3 py-3 text-left text-xs font-bold text-slate-800 cursor-pointer">
                  <span>운영비·채널 가정 (P1)</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>
                {showAdvanced && <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
                  <label className="block"><span className="text-[11px] font-semibold text-slate-600">광고·노출 예산</span><div className="relative mt-1"><input aria-label="광고 노출 예산" type="number" min="0" max="10000000" step="10000" value={activeControls.adBudget} onChange={(event) => updateControl('adBudget', Math.min(10000000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
                  <label className="block"><div className="flex items-center justify-between text-[11px] font-semibold text-slate-600"><span>온라인 판매 비중</span><span className="font-mono text-[#0F4C3A]">{activeControls.onlineShareRate}%</span></div><input aria-label="온라인 판매 비중" type="range" min="0" max="100" step="5" value={activeControls.onlineShareRate} onChange={(event) => updateControl('onlineShareRate', Number(event.target.value))} className="mt-2 w-full accent-[#0F4C3A]" /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block"><span className="text-[11px] font-semibold text-slate-600">반품률 가정</span><div className="relative mt-1"><input aria-label="반품률 가정" type="number" min="0" max="20" step="0.5" value={activeControls.returnRate} onChange={(event) => updateControl('returnRate', Math.min(20, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-7 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>
                    <label className="block"><span className="text-[11px] font-semibold text-slate-600">포장비/개</span><div className="relative mt-1"><input aria-label="포장비" type="number" min="0" max="30000" step="100" value={activeControls.packingCostPerUnit} onChange={(event) => updateControl('packingCostPerUnit', Math.min(30000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block"><span className="text-[11px] font-semibold text-slate-600">번들 조립비/개</span><div className="relative mt-1"><input aria-label="번들 조립비" type="number" min="0" max="30000" step="100" value={activeControls.bundleAssemblyCost} onChange={(event) => updateControl('bundleAssemblyCost', Math.min(30000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
                    <label className="block"><span className="text-[11px] font-semibold text-slate-600">보관비/개·일</span><div className="relative mt-1"><input aria-label="보관비" type="number" min="0" max="10000" step="50" value={activeControls.storageCostPerUnitDay} onChange={(event) => updateControl('storageCostPerUnitDay', Math.min(10000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
                  </div>
                  <label className="block"><span className="text-[11px] font-semibold text-slate-600">폐기 회피 비용/개</span><div className="relative mt-1"><input aria-label="폐기 회피 비용" type="number" min="0" max="200000" step="500" value={activeControls.disposalCostPerUnit} onChange={(event) => updateControl('disposalCostPerUnit', Math.min(200000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
                  <p className="text-[10px] leading-relaxed text-slate-400">P1 가정은 비용 민감도 확인용입니다. 실제 정산 비용은 승인 전 원천 데이터로 재검증합니다.</p>
                </div>}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-relaxed text-amber-900">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> 원가·재고·유통기한·소유권·최대 할인 한도는 실제 운영 데이터 기준의 읽기 전용 가드레일입니다.
              </div>
            </div>
          </aside>

          <main className="space-y-5">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['예상 판매량', `${activeResult.expectedSalesQty.toLocaleString()}개`, 'text-slate-900'],
                ['예상 소진기간', `${activeResult.liquidationDays}일`, 'text-slate-900'],
                ['증분 기여현금이익', formatMoney(activeResult.incrementalContribution), 'text-[#0F4C3A]'],
                ['예상 잔여재고', `${activeResult.remainingQty.toLocaleString()}개`, activeResult.remainingQty > activeOption.inventoryQty * 0.35 ? 'text-red-700' : 'text-slate-900'],
              ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className={`mt-2 text-lg font-bold font-mono ${color}`}>{value}</p></div>)}
            </section>

            {activeResult.warningMessages.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-1.5 text-xs font-bold text-amber-900"><AlertTriangle className="h-4 w-4" /> 조정안 검토 필요</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{activeResult.warningMessages.map((warning) => <p key={warning} className="text-[11px] text-amber-900">· {warning}</p>)}</div></div>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3"><div><h2 className="text-sm font-bold text-slate-900">할인율별 전략 비교</h2><p className="mt-1 text-[11px] text-slate-500">조용한 전략은 실선, 같은 조건에서 할인율만 바꾼 예상 곡선으로 표시합니다.</p></div><span className="text-[10px] font-bold text-[#0F4C3A]">단위: 만원 / 개</span></div>
              <div className="mt-4 h-[380px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#dbe4e8" /><XAxis dataKey="discountRate" fontSize={12} stroke="#475569" /><YAxis yAxisId="margin" fontSize={12} stroke="#0F4C3A" unit="만" /><YAxis yAxisId="sales" orientation="right" fontSize={12} stroke="#1D4ED8" unit="개" /><Tooltip formatter={(value: number, name: string) => [name.includes('margin') ? `${value.toLocaleString()}만원` : `${value.toLocaleString()}개`, name.includes('margin') ? '예상 기여이익' : '예상 판매량']} contentStyle={{ borderRadius: 10, borderColor: '#94a3b8', fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />{selectedOptions.map((option) => <Line key={`margin-${option.id}`} yAxisId="margin" type="monotone" dataKey={`margin_${option.id}`} name={`${option.categoryLabel} · 이익`} stroke={colors[option.id] || '#0F4C3A'} strokeWidth={option.id === activeOption.id ? 4 : 2.5} dot={{ r: option.id === activeOption.id ? 3 : 2 }} />)}{selectedOptions.map((option) => <Line key={`sales-${option.id}`} yAxisId="sales" type="monotone" dataKey={`sales_${option.id}`} name={`${option.categoryLabel} · 판매량`} stroke={colors[option.id] || '#2563EB'} strokeOpacity={0.6} strokeDasharray="6 4" strokeWidth={2} dot={false} />)}</ComposedChart></ResponsiveContainer></div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-slate-900">비용·기여이익 브레이크다운</h2><span className="text-[11px] font-bold text-slate-800">AI 추천값 기준 재계산</span></div><div className="mt-3 divide-y divide-slate-100">{costRows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="text-slate-500">{label}</span><span className={`font-mono font-semibold ${Number(value) < 0 ? 'text-slate-700' : 'text-[#0F4C3A]'}`}>{Number(value) < 0 ? '-' : '+'}{formatWon(Math.abs(Number(value)))}</span></div>)}<div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold"><span>기준선 대비 증분 기여현금이익</span><span className="font-mono text-[#0F4C3A]">+{formatMoney(activeResult.incrementalContribution)}</span></div></div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h2 className="text-sm font-bold text-slate-900">AI 원본 vs 조정안</h2><p className="mt-1 text-[11px] text-slate-500">현재 선택한 전략의 조정 결과입니다.</p><div className="mt-3 space-y-2">{[["할인율", `${getDefaultControls(activeOption).discountRate}%`, `${activeControls.discountRate}%`], ["프로모션 기간", `${getDefaultControls(activeOption).campaignDays}일`, `${activeControls.campaignDays}일`], ["예상 판매량", `${activeOption.expectedSalesQty}개`, `${activeResult.expectedSalesQty}개`], ["증분 기여이익", formatMoney(activeOption.expectedNetContributionMargin), formatMoney(activeResult.incrementalContribution)]].map(([label, base, adjusted]) => <div key={label} className="grid grid-cols-[1fr_0.8fr_0.8fr] items-center gap-2 border-b border-slate-100 py-2 text-[11px]"><span className="text-slate-500">{label}</span><span className="text-right text-slate-500">{base}</span><span className="text-right font-bold text-[#0F4C3A]">{adjusted}</span></div>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-center text-[10px]"><div className="rounded-lg bg-slate-50 p-2 text-slate-500">AI 추천 원본</div><div className="rounded-lg bg-emerald-50 p-2 font-bold text-[#0F4C3A]">사용자 조정안</div></div></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><div><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><GitBranch className="h-4 w-4 text-[#0F4C3A]" />사후 대처 (Fallback Action Plan)</h2><p className="mt-1 text-[11px] text-slate-500">조정한 할인율·기간·수량을 기준으로 판매 달성률 구간별 대응을 다시 계산합니다.</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-[#0F4C3A]">5단계</span></div><div className="mt-4 space-y-2.5">{fallbackSteps.map((step) => <div key={step.id} className={`rounded-xl border p-3 ${toneClasses[step.tone].card}`}><div className="grid gap-3 lg:grid-cols-[145px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] lg:items-start lg:gap-4"><div className="flex items-center justify-between gap-2 lg:block"><div className="flex items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${toneClasses[step.tone].badge}`}>{step.range}</span><span className="text-xs font-bold text-slate-800">{step.level}</span></div><span className="mt-1 block text-[10px] font-semibold text-slate-500">{step.checkpoint}</span></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">발동 조건</p><p className="mt-1 text-xs font-semibold leading-relaxed text-slate-800">{step.trigger}</p></div><div className="lg:border-l lg:border-slate-200/80 lg:pl-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">추천 후속 전략</p><p className="mt-1 text-xs font-bold leading-relaxed text-slate-900">{step.action}</p></div><div className="lg:border-l lg:border-slate-200/80 lg:pl-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">예상 효과</p><p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800">{step.expectedImpact}</p></div></div></div>)}</div></section>

            {/* Bottom Action Bar: Trigger Review Proposal Modal */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#0F4C3A]/20 bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold text-[#0F4C3A]">조정안 담당자 협의 및 검토 요청</p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Microsoft Teams 또는 Slack 채널을 선택하여 관련 MD 담당자에게 이 시뮬레이션 조정안 검토 요청을 전송합니다.
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  approved
                    ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                    : 'bg-[#0F4C3A] text-white hover:bg-[#0B392B]'
                }`}
              >
                {approved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>협의 검토 요청 전송 완료</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-[#9E7C3B]" />
                    <span>이 조정안 검토 요청</span>
                  </>
                )}
              </button>
            </div>
          </main>
        </div>

        {isHmallPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071d49] text-white"><ShoppingBag className="h-5 w-5" /></div>
                  <div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">Hmall 판매화면 미리보기</h3><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">시연용</span></div><p className="mt-0.5 text-[11px] text-slate-500">현재 시뮬레이션 조건이 고객 화면에 적용되는 모습을 확인합니다.</p></div>
                </div>
                <button type="button" onClick={() => setIsHmallPreviewOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="bg-[#f7f7f7] p-5 sm:p-7">
                <div className="mb-4 flex items-center justify-between rounded-xl bg-[#071d49] px-4 py-3 text-white"><div className="flex items-center gap-2"><span className="text-xl font-black tracking-tight">Hmall</span><span className="text-[10px] text-blue-100">현대백화점그룹 통합 온라인몰</span></div><span className="text-[10px] text-blue-100">AI 전략 적용 Preview</span></div>
                <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[1fr_1.05fr]">
                  <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImage} alt={previewProduct.imageAlt} className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">{activeControls.discountRate}% SALE</span>
                      {activeControls.bundleEnabled && <span className="absolute right-3 top-3 rounded-md bg-[#0F4C3A] px-2.5 py-1 text-xs font-bold text-white">그룹사 번들</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500"><div className="rounded-lg bg-slate-50 p-2">Hmall 단독</div><div className="rounded-lg bg-slate-50 p-2">한정수량</div><div className="rounded-lg bg-slate-50 p-2">기간한정</div></div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <span className="text-xs font-bold text-[#0F4C3A]">{previewProduct.affiliate} · {previewProduct.brand}</span>
                    <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950">{previewProduct.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{previewSku.optionLabel} · {previewSku.code}</p>
                    <div className="mt-5 border-y border-slate-100 py-4">
                      <div className="flex items-end gap-2"><span className="text-2xl font-black text-rose-600">{activeControls.discountRate}%</span><span className="text-3xl font-black text-slate-950">₩{discountedPrice.toLocaleString()}</span></div>
                      <p className="mt-1 text-sm text-slate-400 line-through">정상가 ₩{previewSku.sellingPrice.toLocaleString()}</p>
                      {activeControls.couponRate > 0 && <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs"><span className="font-bold text-rose-700">쿠폰 적용 시</span><strong className="text-base text-rose-700">₩{couponPrice.toLocaleString()}</strong></div>}
                    </div>
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex justify-between gap-3"><span className="text-slate-500">프로모션</span><strong className="text-right text-slate-900">{activeOption.name}</strong></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">판매기간</span><strong className="text-slate-900">{activeControls.campaignDays}일간</strong></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">판매수량</span><strong className="text-slate-900">{activeControls.appliedQuantity.toLocaleString()}{previewSku.unit} 한정</strong></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">배송혜택</span><strong className={activeControls.freeShipping ? 'text-[#0F4C3A]' : 'text-slate-900'}>{activeControls.freeShipping ? '무료배송' : '기본 배송비 적용'}</strong></div>
                      {activeControls.pointRate > 0 && <div className="flex justify-between gap-3"><span className="text-slate-500">H.Point</span><strong className="text-[#0F4C3A]">{activeControls.pointRate}% 적립</strong></div>}
                    </div>
                    <button type="button" className="mt-6 w-full rounded-xl bg-[#071d49] py-3.5 text-sm font-bold text-white">구매하기</button>
                    <p className="mt-2 text-center text-[10px] text-slate-400">미리보기 화면으로 실제 주문이나 상품 등록은 진행되지 않습니다.</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:grid-cols-3"><div><p className="text-[10px] text-emerald-700">예상 판매량</p><p className="mt-1 font-bold text-emerald-950">{activeResult.expectedSalesQty.toLocaleString()}{previewSku.unit}</p></div><div><p className="text-[10px] text-emerald-700">예상 잔여재고</p><p className="mt-1 font-bold text-emerald-950">{activeResult.remainingQty.toLocaleString()}{previewSku.unit}</p></div><div><p className="text-[10px] text-emerald-700">예상 소진기간</p><p className="mt-1 font-bold text-emerald-950">{activeResult.liquidationDays}일</p></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Review Proposal Modal (담당자 및 메시지 채널 선택) */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-xs">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0F4C3A] text-white flex items-center justify-center font-bold">
                    <Send className="w-4 h-4 text-[#9E7C3B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">더현대 서울 재고 전략 협의 검토 요청</h3>
                    <p className="text-[11px] text-slate-500">메시지 채널과 수신 담당자를 지정하여 조정안을 공유합니다.</p>
                  </div>
                </div>
                <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Messenger Channel Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 block">1. 요청 메시지 연동 채널 선택</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('TEAMS')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      selectedChannel === 'TEAMS'
                        ? 'border-[#0F4C3A] bg-emerald-50 text-[#0F4C3A] shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span>Microsoft Teams</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('SLACK')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      selectedChannel === 'SLACK'
                        ? 'border-[#0F4C3A] bg-emerald-50 text-[#0F4C3A] shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-amber-600" />
                    <span>Slack</span>
                  </button>
                </div>
              </div>

              {/* 2. Recipient Manager Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 block flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#0F4C3A]" />
                  <span>2. 수신 담당자 선택</span>
                </label>
                <select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:outline-none focus:border-[#0F4C3A]"
                >
                  {REVIEWERS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Review Due Date */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0F4C3A]" />
                  <span>3. 검토 마감일 설정</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0F4C3A]"
                />
              </div>

              {/* 4. AI Pre-filled Draft Message Preview */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 block">4. 전송할 요청 문구 미리보기 (AI 자동 생성)</label>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 space-y-1 font-mono text-[11px] leading-relaxed">
                  <p className="font-bold text-[#0F4C3A]">[{selectedChannel === 'TEAMS' ? 'Microsoft Teams' : 'Slack'} 알림 전송 예시]</p>
                  <p className="font-bold text-slate-900">[더현대 서울 AI 재고 최적화 전략 검토 요청]</p>
                  <p>· 대상 케이스: {caseData.title}</p>
                  <p>· 선택 대안: {activeOption.name} ({activeControls.discountRate}% 할인)</p>
                  <p>· 예상 증분 기여이익: {formatMoney(activeResult.incrementalContribution)}</p>
                  <p>· 예상 소진 기간: {activeResult.liquidationDays}일 완판</p>
                  <p>· 회피 폐기손실: {formatWon(activeResult.avoidedDisposalCost)}</p>
                  <p>· 검토 마감일: {dueDate}</p>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSendProposal}
                  className="px-5 py-2.5 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0B392B] text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#9E7C3B]" />
                  <span>{selectedChannel === 'TEAMS' ? 'Teams' : 'Slack'} 채널로 전송하기</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
