'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  CircleDollarSign,
  Clock3,
  Gift,
  Globe2,
  Loader2,
  Megaphone,
  MessageSquareText,
  PackageCheck,
  Percent,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Truck,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import {
  ChannelInventory,
  getChannelInventoryBySku,
  getChannelInventoryItem,
  getTransferRecommendation,
} from '@/lib/greenfood-channel-data';

type GoalKey = 'SELL_THROUGH' | 'MARGIN' | 'REVENUE';
type StrategyKey =
  | 'REALLOCATION'
  | 'RT'
  | 'FLASH_SALE'
  | 'COUPON'
  | 'BUNDLE'
  | 'TARGETED'
  | 'MIN_DISCOUNT'
  | 'POINT_REWARD'
  | 'CHANNEL_EXPANSION'
  | 'MAIN_EXPOSURE'
  | 'CROSS_SELL';

interface StrategyDefinition {
  key: StrategyKey;
  group: 'OPERATION' | GoalKey;
  title: string;
  description: string;
  icon: typeof RefreshCw;
  defaultDiscount: number;
  defaultDays: number;
  salesLift: number;
  confidence: number;
}

const GOAL_META: Record<GoalKey, { label: string; description: string; icon: typeof Clock3 }> = {
  SELL_THROUGH: { label: '빠른 소진', description: '소비기한과 보관 손실을 줄이는 판매안', icon: Clock3 },
  MARGIN: { label: '마진 극대화', description: '할인 폭을 낮추고 이익을 방어하는 판매안', icon: CircleDollarSign },
  REVENUE: { label: '최대 매출', description: '노출과 판매량을 확대하는 판매안', icon: Megaphone },
};

const STRATEGIES: StrategyDefinition[] = [
  { key: 'REALLOCATION', group: 'OPERATION', title: '재고 재할당', description: '같은 물류센터의 온라인·오프라인 할당량만 조정합니다.', icon: RefreshCw, defaultDiscount: 0, defaultDays: 14, salesLift: 1, confidence: 94 },
  { key: 'RT', group: 'OPERATION', title: 'RT 재고 이동', description: '다른 센터 또는 점포의 여유재고를 실제로 이동합니다.', icon: Truck, defaultDiscount: 0, defaultDays: 14, salesLift: 1, confidence: 90 },
  { key: 'FLASH_SALE', group: 'SELL_THROUGH', title: '15% 기간 한정 할인', description: '10일 동안 할인해 임박 재고를 우선 소진합니다.', icon: Percent, defaultDiscount: 15, defaultDays: 10, salesLift: 1.55, confidence: 88 },
  { key: 'COUPON', group: 'SELL_THROUGH', title: '10% 쿠폰 + 무료배송', description: '가격 부담을 낮춰 단기간 구매전환을 높입니다.', icon: Gift, defaultDiscount: 10, defaultDays: 14, salesLift: 1.38, confidence: 84 },
  { key: 'BUNDLE', group: 'SELL_THROUGH', title: '연관상품 묶음 판매', description: '잘 팔리는 상품과 구성해 재고 소진 속도를 높입니다.', icon: Boxes, defaultDiscount: 12, defaultDays: 18, salesLift: 1.32, confidence: 81 },
  { key: 'TARGETED', group: 'MARGIN', title: '타깃 고객 집중 노출', description: '할인을 최소화하고 구매 가능성이 높은 고객에게 노출합니다.', icon: Target, defaultDiscount: 3, defaultDays: 21, salesLift: 1.16, confidence: 86 },
  { key: 'MIN_DISCOUNT', group: 'MARGIN', title: '8% 제한 할인', description: '마진 하락을 제한하면서 판매속도를 보완합니다.', icon: Percent, defaultDiscount: 8, defaultDays: 28, salesLift: 1.22, confidence: 89 },
  { key: 'POINT_REWARD', group: 'MARGIN', title: 'H.Point 5% 적립', description: '판매가를 유지하면서 체감 혜택을 제공합니다.', icon: Gift, defaultDiscount: 0, defaultDays: 28, salesLift: 1.14, confidence: 82 },
  { key: 'CHANNEL_EXPANSION', group: 'REVENUE', title: '판매채널 확대', description: '그리팅몰 외 온라인 판매처에 추가 노출합니다.', icon: Globe2, defaultDiscount: 5, defaultDays: 21, salesLift: 1.35, confidence: 85 },
  { key: 'MAIN_EXPOSURE', group: 'REVENUE', title: '기획전 메인 노출', description: '주요 배너와 카테고리 상단에서 판매량을 확대합니다.', icon: Megaphone, defaultDiscount: 10, defaultDays: 14, salesLift: 1.48, confidence: 87 },
  { key: 'CROSS_SELL', group: 'REVENUE', title: '연관상품 교차판매', description: '장바구니 연관상품으로 노출해 객단가를 높입니다.', icon: Sparkles, defaultDiscount: 7, defaultDays: 28, salesLift: 1.3, confidence: 80 },
];

const STRATEGY_MAP = Object.fromEntries(STRATEGIES.map((item) => [item.key, item])) as Record<StrategyKey, StrategyDefinition>;

function StrategyOptimizeContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') ?? 'GF-P-001';
  const skuId = searchParams.get('skuId') ?? 'GF-SKU-001';
  const requestedChannelId = searchParams.get('channelId');
  const product = INVENTORY_PRODUCTS.find((item) => item.id === productId && item.affiliate === '현대그린푸드')
    ?? INVENTORY_PRODUCTS.find((item) => item.affiliate === '현대그린푸드')!;
  const sku = product.skus.find((item) => item.id === skuId) ?? product.skus[0];
  const channelRows = getChannelInventoryBySku(sku.id).filter((row) => row.channelType !== 'CENTER');
  const recommendation = getTransferRecommendation(sku.id);
  const recommendationSource = recommendation ? getChannelInventoryItem(recommendation.sourceId) : undefined;
  const requestedDestination = channelRows.find((row) => row.id === requestedChannelId);
  const recommendationDestination = recommendation ? getChannelInventoryItem(recommendation.destinationId) : undefined;
  const defaultDestination = requestedDestination ?? recommendationDestination ?? channelRows.find((row) => row.health === 'SHORTAGE') ?? channelRows[0];
  const defaultSource = recommendationSource && recommendationSource.id !== defaultDestination?.id
    ? recommendationSource
    : channelRows.find((row) => row.id !== defaultDestination?.id && row.health === 'SURPLUS') ?? channelRows.find((row) => row.id !== defaultDestination?.id);
  const recommendedMovement: StrategyKey = recommendation?.mode ?? 'REALLOCATION';

  const [goal, setGoal] = useState<GoalKey>('SELL_THROUGH');
  const [strategy, setStrategy] = useState<StrategyKey>(recommendedMovement);
  const [sourceId, setSourceId] = useState(defaultSource?.id ?? '');
  const [destinationId] = useState(defaultDestination?.id ?? '');
  const [quantity, setQuantity] = useState(recommendation?.quantity ?? 20);
  const [discountRate, setDiscountRate] = useState(STRATEGY_MAP[recommendedMovement].defaultDiscount);
  const [periodDays, setPeriodDays] = useState(STRATEGY_MAP[recommendedMovement].defaultDays);
  const [promotionCost, setPromotionCost] = useState(120000);
  const [requestState, setRequestState] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE');

  const selected = STRATEGY_MAP[strategy];
  const source = channelRows.find((row) => row.id === sourceId) ?? defaultSource;
  const destination = channelRows.find((row) => row.id === destinationId) ?? defaultDestination;
  const movementStrategies = STRATEGIES.filter((item) => item.group === 'OPERATION');
  const salesStrategies = STRATEGIES.filter((item) => item.group === goal);
  const isMovement = selected.group === 'OPERATION';
  const sameCenter = Boolean(source && destination && source.fulfillmentCenter === destination.fulfillmentCenter);
  const maxQuantity = Math.max(1, (source?.availableStock ?? 1) - (source?.safetyStock ?? 0));
  const salesBaseQuantity = Math.max(1, destination?.availableStock ?? sku.availableStock);
  const quantityMaximum = isMovement ? maxQuantity : salesBaseQuantity;
  const appliedQuantity = Math.min(Math.max(1, quantity), quantityMaximum);
  const transferCost = strategy === 'REALLOCATION' ? Math.round(appliedQuantity * 580) : strategy === 'RT' ? Math.round(appliedQuantity * 4200) : 0;
  const unitPrice = Math.round(sku.sellingPrice * (1 - discountRate / 100));
  const baseDailySales = Math.max(0.5, destination?.dailySales ?? sku.salesVelocity);
  const projectedDemand = isMovement
    ? Math.max(0, (destination?.forecast14Days ?? 0) + (destination?.safetyStock ?? 0) - (destination?.availableStock ?? 0))
    : Math.round(baseDailySales * periodDays * selected.salesLift);
  const expectedSales = Math.min(appliedQuantity, Math.max(1, projectedDemand));
  const expectedRevenue = expectedSales * unitPrice;
  const grossProfit = Math.round(expectedRevenue * 0.38 - transferCost - (isMovement ? 0 : promotionCost));
  const marginRate = expectedRevenue > 0 ? Math.max(0, Math.round((grossProfit / expectedRevenue) * 1000) / 10) : 0;
  const remainingStock = Math.max(0, appliedQuantity - expectedSales);
  const selloutDays = Math.max(1, Math.ceil(appliedQuantity / Math.max(0.5, baseDailySales * selected.salesLift)));
  const sourceAfter = Math.max(0, (source?.availableStock ?? 0) - appliedQuantity);
  const destinationAfter = (destination?.availableStock ?? 0) + appliedQuantity;

  const chooseStrategy = (key: StrategyKey) => {
    const next = STRATEGY_MAP[key];
    setStrategy(key);
    setDiscountRate(next.defaultDiscount);
    setPeriodDays(next.defaultDays);
    setQuantity(key === 'REALLOCATION' || key === 'RT' ? Math.min(recommendation?.quantity ?? 20, maxQuantity) : Math.min(salesBaseQuantity, 100));
    setRequestState('IDLE');
  };

  const submitTeamsRequest = () => {
    setRequestState('SENDING');
    window.setTimeout(() => setRequestState('SENT'), 900);
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-20">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/inventory/all" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F4C3A]"><ArrowLeft className="h-3.5 w-3.5" />통합재고로 돌아가기</Link>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">현대그린푸드</span><span className="font-mono text-xs text-slate-400">{sku.code}</span></div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{sku.optionLabel} AI 재고 최적화</h1>
            <p className="mt-1 text-sm text-slate-500">재고 이동을 먼저 검토하고, 이동만으로 해결되지 않는 수량은 목적별 판매 전략을 비교합니다.</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right"><p className="text-[10px] font-bold text-emerald-700">현재 선택 전략</p><p className="mt-1 text-base font-black text-[#0F4C3A]">{selected.title}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#0F4C3A]">1단계 · 할인 전 우선 검토</p><h2 className="mt-1 text-lg font-black text-slate-950">재고 이동 가능성</h2><p className="mt-1 text-xs text-slate-500">추가 생산이나 할인보다 재할당·RT로 판매처 불균형을 먼저 해결합니다.</p></div>{recommendation && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold text-amber-800">AI 최우선 추천 · {recommendedMovement === 'REALLOCATION' ? '재고 재할당' : 'RT 재고 이동'}</span>}</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {movementStrategies.map((item) => {
            const Icon = item.icon;
            const active = strategy === item.key;
            const available = item.key !== 'REALLOCATION' || sameCenter;
            return <button key={item.key} type="button" disabled={!available} onClick={() => chooseStrategy(item.key)} className={`rounded-xl border p-4 text-left transition ${active ? 'border-[#0F4C3A] bg-emerald-50 ring-1 ring-[#0F4C3A]/20' : 'border-slate-200 bg-white hover:border-emerald-300'} disabled:cursor-not-allowed disabled:opacity-45`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#0F4C3A] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{item.title}</p>{recommendedMovement === item.key && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-800">AI 추천</span>}</div><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p><p className="mt-2 text-[11px] font-semibold text-[#0F4C3A]">{source?.channelName ?? '여유 판매처'} → {destination?.channelName ?? '로그인 소속 판매처'} · 최대 {maxQuantity}{sku.unit}</p>{!available && <p className="mt-1 text-[10px] font-bold text-rose-600">서로 다른 센터이므로 재할당 대신 RT가 필요합니다.</p>}</div></div></button>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-xs font-bold text-[#0F4C3A]">2단계 · 이동 후 잔여재고 처리</p><h2 className="mt-1 text-lg font-black text-slate-950">목적별 판매 전략</h2><p className="mt-1 text-xs text-slate-500">목적을 선택하면 최대 3개의 추천안을 같은 기준으로 비교할 수 있습니다.</p></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(GOAL_META) as GoalKey[]).map((key) => { const meta = GOAL_META[key]; const Icon = meta.icon; return <button key={key} type="button" onClick={() => setGoal(key)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition ${goal === key ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" /><span><strong className="block text-xs">{meta.label}</strong><span className={`mt-0.5 hidden text-[9px] sm:block ${goal === key ? 'text-emerald-100' : 'text-slate-400'}`}>{meta.description}</span></span></button>; })}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {salesStrategies.map((item, index) => <StrategyCard key={item.key} item={item} rank={index + 1} active={strategy === item.key} skuUnit={sku.unit} baseDailySales={baseDailySales} onSelect={() => chooseStrategy(item.key)} />)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-bold text-[#0F4C3A]">3단계 · 조건 조정</p><h2 className="mt-1 text-lg font-black text-slate-900">{selected.title} 시뮬레이션</h2></div>
          {isMovement && <><SelectField label="보내는 판매처" value={sourceId} onChange={(value) => { setSourceId(value); setRequestState('IDLE'); }} rows={channelRows.filter((row) => row.id !== destinationId)} unit={sku.unit} /><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-bold text-emerald-700">받는 판매처 · 로그인 소속</p><p className="mt-1 text-xs font-black text-[#0F4C3A]">{destination?.channelName ?? '-'}</p><p className="mt-1 text-[10px] text-emerald-700">받는 판매처는 변경할 수 없습니다.</p></div></>}
          <RangeField label="적용 수량" value={appliedQuantity} min={1} max={quantityMaximum} suffix={sku.unit} onChange={(value) => { setQuantity(value); setRequestState('IDLE'); }} />
          {!isMovement && <><RangeField label="할인율" value={discountRate} min={0} max={35} step={1} suffix="%" onChange={(value) => { setDiscountRate(value); setRequestState('IDLE'); }} /><RangeField label="판매기간" value={periodDays} min={7} max={35} suffix="일" onChange={(value) => { setPeriodDays(value); setRequestState('IDLE'); }} /><label className="block text-xs font-bold text-slate-700">프로모션 비용<input type="number" min={0} step={10000} value={promotionCost} onChange={(event) => { setPromotionCost(Math.max(0, Number(event.target.value))); setRequestState('IDLE'); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#0F4C3A]" /></label></>}
          <div className="rounded-xl bg-slate-50 p-4 text-xs"><div className="flex items-center justify-between"><span className="text-slate-500">판매가</span><strong className="text-slate-900">₩{unitPrice.toLocaleString()}</strong></div><div className="mt-3 flex items-center justify-between"><span className="text-slate-500">실행비용</span><strong className="text-slate-900">₩{(transferCost + (isMovement ? 0 : promotionCost)).toLocaleString()}</strong></div><div className="mt-3 flex items-center justify-between"><span className="text-slate-500">신뢰도</span><strong className="text-[#0F4C3A]">{selected.confidence}%</strong></div></div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#0F4C3A]">시뮬레이션 결과</p><h2 className="mt-1 text-lg font-black text-slate-900">조건 변경 결과 즉시 비교</h2><p className="mt-1 text-xs text-slate-500">판매이력과 현재 재고를 이용한 시연용 예상값입니다.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" />실행 가능</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><ResultCard icon={PackageCheck} label="예상 판매수량" value={`${expectedSales}${sku.unit}`} tone="emerald" /><ResultCard icon={CircleDollarSign} label="예상 매출" value={`₩${expectedRevenue.toLocaleString()}`} tone="navy" /><ResultCard icon={Sparkles} label="예상 이익" value={`₩${grossProfit.toLocaleString()}`} tone="sky" /><ResultCard icon={Percent} label="예상 마진율" value={`${marginRate}%`} tone="amber" /><ResultCard icon={Boxes} label="종료 후 잔여" value={`${remainingStock}${sku.unit}`} tone="slate" /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-500">예상 소진 기간</p><p className="mt-1 text-xl font-black text-slate-900">{selloutDays}일</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-500">전략 적용 범위</p><p className="mt-1 text-sm font-black text-slate-900">{appliedQuantity}{sku.unit} · {isMovement ? '정상가 유지' : `${discountRate}% 할인`}</p></div></div>
            {isMovement && <div className="mt-4 grid gap-4 lg:grid-cols-2"><InventoryChangeCard title="보내는 판매처" row={source} before={source?.availableStock ?? 0} after={sourceAfter} unit={sku.unit} direction="down" /><InventoryChangeCard title="받는 판매처" row={destination} before={destination?.availableStock ?? 0} after={destinationAfter} unit={sku.unit} direction="up" /></div>}
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-bold text-sky-900">AI 추천 근거</p><p className="mt-1 text-xs leading-5 text-sky-800">{isMovement ? recommendation?.reason ?? '판매속도가 느린 판매처의 안전재고 초과분을 부족 판매처로 이동하면 추가 생산 없이 판매 기회를 확보할 수 있습니다.' : `${GOAL_META[selected.group as GoalKey].label} 목적에 맞춰 ${selected.title}을 추천합니다. 할인율·적용 수량·판매기간을 변경하면 예상 매출과 마진이 다시 계산됩니다.`}</p></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-[#0F4C3A]" /><h2 className="text-base font-black text-slate-900">Microsoft Teams 검토 요청</h2></div><p className="mt-1 text-xs text-slate-500">조정한 최종 조건만 책임자에게 전송하며 실제 승인은 프로젝트 범위에서 제외합니다.</p></div><button type="button" onClick={submitTeamsRequest} disabled={requestState !== 'IDLE'} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#0F4C3A] px-5 py-3 text-xs font-bold text-white shadow-sm disabled:opacity-70">{requestState === 'SENDING' ? <Loader2 className="h-4 w-4 animate-spin" /> : requestState === 'SENT' ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}{requestState === 'SENDING' ? '전송 중' : requestState === 'SENT' ? '검토 요청 전송 완료' : 'Teams로 검토 요청'}</button></div>{requestState === 'SENT' && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"><strong>{selected.title}</strong> · 적용 {appliedQuantity}{sku.unit} · 예상 매출 ₩{expectedRevenue.toLocaleString()} 조건이 전송되었습니다.</div>}</div>
        </div>
      </section>
    </div>
  );
}

function StrategyCard({ item, rank, active, skuUnit, baseDailySales, onSelect }: { item: StrategyDefinition; rank: number; active: boolean; skuUnit: string; baseDailySales: number; onSelect: () => void }) {
  const Icon = item.icon;
  const sampleSales = Math.max(1, Math.round(baseDailySales * item.defaultDays * item.salesLift));
  return <button type="button" onClick={onSelect} className={`rounded-xl border p-4 text-left transition ${active ? 'border-[#0F4C3A] bg-emerald-50 shadow-sm ring-1 ring-[#0F4C3A]/20' : 'border-slate-200 bg-white hover:border-emerald-300'}`}><div className="flex items-start justify-between gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-[#0F4C3A] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-4 w-4" /></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{rank}안</span></div><p className="mt-3 text-sm font-black text-slate-900">{item.title}</p><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{item.description}</p><div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center"><div><p className="text-[9px] text-slate-400">기본 할인</p><p className="mt-1 text-[11px] font-bold text-slate-800">{item.defaultDiscount}%</p></div><div><p className="text-[9px] text-slate-400">예상 판매</p><p className="mt-1 text-[11px] font-bold text-[#0F4C3A]">{sampleSales}{skuUnit}</p></div><div><p className="text-[9px] text-slate-400">신뢰도</p><p className="mt-1 text-[11px] font-bold text-slate-800">{item.confidence}%</p></div></div></button>;
}

function SelectField({ label, value, onChange, rows, unit }: { label: string; value: string; onChange: (value: string) => void; rows: ChannelInventory[]; unit: string }) {
  return <label className="block text-xs font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#0F4C3A]">{rows.map((row) => <option key={row.id} value={row.id}>{row.channelName} · 이동 가능 {Math.max(0, row.availableStock - row.safetyStock)}{unit}</option>)}</select></label>;
}

function RangeField({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) {
  return <div><div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-700">{label}</span><span className="font-black text-[#0F4C3A]">{value}{suffix}</span></div><input type="range" min={min} max={Math.max(min, max)} step={step} value={Math.min(value, Math.max(min, max))} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-[#0F4C3A]" /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{min}{suffix}</span><span>최대 {max}{suffix}</span></div></div>;
}

function ResultCard({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone: 'emerald' | 'navy' | 'sky' | 'amber' | 'slate' }) {
  const tones = { emerald: 'bg-emerald-50 text-emerald-700', navy: 'bg-slate-100 text-slate-700', sky: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-50 text-slate-600' };
  return <div className="rounded-xl border border-slate-200 p-4"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div><p className="mt-3 text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>;
}

function InventoryChangeCard({ title, row, before, after, unit, direction }: { title: string; row?: ChannelInventory; before: number; after: number; unit: string; direction: 'up' | 'down' }) {
  const max = Math.max(before, after, 1);
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold text-slate-500">{title}</p><p className="mt-1 text-sm font-black text-slate-900">{row?.channelName ?? '-'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${direction === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{direction === 'up' ? '부족 해소' : '과잉 감소'}</span></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div><p className="text-[10px] text-slate-400">실행 전</p><p className="mt-1 text-lg font-black text-slate-700">{before}{unit}</p></div><ArrowRight className="h-4 w-4 text-slate-300" /><div><p className="text-[10px] text-slate-400">실행 후</p><p className="mt-1 text-lg font-black text-[#0F4C3A]">{after}{unit}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0F4C3A]" style={{ width: `${Math.max(8, Math.round((after / max) * 100))}%` }} /></div></div>;
}

export default function StrategyOptimizePage() {
  return <AppLayout><Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">전략 시뮬레이션을 준비하고 있습니다.</div>}><StrategyOptimizeContent /></Suspense></AppLayout>;
}
