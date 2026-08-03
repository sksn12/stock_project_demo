'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { MOCK_OPTIMIZATION_CASES } from '@/lib/mock-data';
import { StrategyOption } from '@/lib/types';
import { getDefaultControls, getSimulationOption, simulateOption, SimulationControls } from '@/lib/simulation';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { 
  Sparkles, 
  ArrowLeft, 
  Layers,
  Check,
  Award,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Truck,
  X
} from 'lucide-react';

type FallbackStep = {
  id: string;
  level: string;
  range: string;
  checkpoint: string;
  trigger: string;
  action: string;
  expectedImpact: string;
  tone: 'normal' | 'watch' | 'adjust' | 'urgent' | 'protect';
};

/**
 * 판매 달성률을 한 번의 임계값으로 판단하지 않고, 실행 중인 전략 유형에
 * 맞춰 5개 구간으로 나눕니다. 달성률은 '누적 판매량 ÷ 계획 판매량'입니다.
 * 실제 운영에서는 이 단계의 trigger만 실시간 판매 데이터로 치환합니다.
 */
function buildFallbackSteps(option: {
  id: string;
  discountRate: number;
  liquidationDays: number;
  expectedNetContributionMargin: number;
  savedDisposalCost: number;
}) : FallbackStep[] {
  const isFast = option.id.startsWith('OPT-FAST');
  const isRevenue = option.id.startsWith('OPT-REV');
  const scenario = isFast ? '완판' : isRevenue ? '매출' : '순마진';
  const day = (ratio: number) => Math.max(1, Math.round(option.liquidationDays * ratio));
  const cumulativeDiscount = (increase: number) => Math.min(50, option.discountRate + increase);

  const actionByBand = isFast
    ? [
        '현재 타임세일 노출과 재고 배치를 유지하고 일별 판매 속도만 모니터링',
        '앱 핫딜 노출면을 확대하고 알림 대상을 추가해 유입을 보정',
        `현대백화점 카드 청구할인 5%를 추가해 누적 할인율을 ${cumulativeDiscount(5)}% 수준으로 조정`,
        `아울렛·번들 판매로 전환하고 누적 할인율을 ${cumulativeDiscount(8)}%까지 단계적으로 확대`,
        '잔여분은 폐기·벤더 회수·기부의 회피비용을 비교해 손실이 가장 작은 대안을 승인',
      ]
    : isRevenue
      ? [
          '현재 전시와 전용 쿠폰을 유지하고 매출·기여이익을 함께 모니터링',
          'VIP 큐레이션 재노출과 개인화 메시지로 할인 없이 추가 수요를 확보',
          `H.Point 3% 추가 적립을 붙여 누적 혜택을 ${cumulativeDiscount(5)}% 수준으로 조정`,
          `30% 타임세일 또는 번들로 전환해 누적 할인율을 ${cumulativeDiscount(8)}%까지 확대`,
          '잔여재고를 회수·기부·폐기 대안과 비교하고 브랜드·기여현금이익을 함께 검토해 승인',
        ]
      : [
          '현재 타겟 할인과 노출을 유지하고 순마진·판매 속도를 매일 확인',
          '타겟 채널 노출을 보강하고 H.Point 3% 추가 적립으로 유입을 보정',
          `추가 5% 제한 쿠폰으로 누적 할인율을 ${cumulativeDiscount(5)}% 수준까지 조정`,
          `저마진 번들·무료배송을 병행하고 누적 할인율을 ${cumulativeDiscount(8)}%까지 확대`,
          '추가 할인은 중단하고 폐기·벤더 회수·기부 대안의 회피비용을 비교해 승인',
        ];

  const expectedImpact = [
    `계획 궤도 유지 · 예상 증분 기여이익 ₩${Math.round(option.expectedNetContributionMargin / 10000).toLocaleString()}만원 방어`,
    `노출 보정 후 90% 이상 달성 재평가 · 신뢰도 하락 없이 ${scenario} 우선`,
    `추가 비용을 반영해도 폐기 회피액 ₩${Math.round(option.savedDisposalCost / 10000).toLocaleString()}만원을 우선 방어`,
    '잔여재고를 빠르게 줄이고 하방 손실을 제한 · 담당자 승인 게이트 적용',
    '판매보다 손실 회피가 유리한지 확인한 뒤 최종 처분 대안을 확정',
  ];

  const bands = [
    { level: '정상 유지', range: '90–100%', ratio: 0.2, tone: 'normal' as const, condition: '계획 대비 누적 판매 달성률 90% 이상' },
    { level: '1차 보정', range: '70–89%', ratio: 0.4, tone: 'watch' as const, condition: '계획 대비 누적 판매 달성률 70–89%' },
    { level: '2차 보정', range: '50–69%', ratio: 0.6, tone: 'adjust' as const, condition: '계획 대비 누적 판매 달성률 50–69%' },
    { level: '강화 전환', range: '30–49%', ratio: 0.8, tone: 'urgent' as const, condition: '계획 대비 누적 판매 달성률 30–49%' },
    { level: '손실 방어', range: '0–29%', ratio: 1, tone: 'protect' as const, condition: '계획 대비 누적 판매 달성률 0–29%' },
  ];

  return bands.map((band, index) => ({
    id: `${option.id}-fallback-${index + 1}`,
    level: band.level,
    range: band.range,
    checkpoint: `${day(band.ratio)}일 차 체크포인트`,
    trigger: band.condition,
    action: actionByBand[index],
    expectedImpact: expectedImpact[index],
    tone: band.tone,
  }));
}

type StrategyCardOption = {
  id: string;
  rankLabel: string;
  isBest?: boolean;
  name: string;
  discountRate: number;
  targetChannel: string;
  expectedNetContributionMargin: number;
  savedDisposalCost: number;
  liquidationDays: number;
  confidenceScore: number;
  reasoning: string;
  fallbackPlan: {
    conditionTrigger: string;
    action: string;
    expectedImpact: string;
  };
};

function StrategyDetailModal({
  option,
  compareCount,
  onClose,
  onOpenComparison,
}: {
  option: StrategyCardOption;
  compareCount: number;
  onClose: () => void;
  onOpenComparison: () => void;
}) {
  const simulationOption = getSimulationOption(option.id);
  const [controls, setControls] = useState<SimulationControls>(() => getDefaultControls(simulationOption!));
  const result = useMemo(() => simulateOption(simulationOption!, controls), [controls, simulationOption]);

  if (!simulationOption) return null;

  const updateControl = <K extends keyof SimulationControls>(key: K, value: SimulationControls[K]) => {
    setControls((current) => ({ ...current, [key]: value }));
  };

  const money = (value: number) => `₩${Math.round(value / 10000).toLocaleString()}만원`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="strategy-detail-title">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#0F4C3A] px-2 py-1 text-[10px] font-bold text-white">{option.rankLabel}</span>
              {option.isBest && <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">AI 추천</span>}
            </div>
            <h2 id="strategy-detail-title" className="mt-2 text-lg font-bold text-slate-900">{option.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{option.targetChannel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="상세 시뮬레이션 닫기" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4 border-b border-slate-200 bg-slate-50/80 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-[#0F4C3A]" />단일 전략 조정</h3>
              <button type="button" onClick={() => setControls(getDefaultControls(simulationOption))} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#0F4C3A]"><RotateCcw className="h-3 w-3" />AI 추천값</button>
            </div>

            <label className="block rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700"><span>상품 할인율</span><span className="font-mono text-[#0F4C3A]">{controls.discountRate}%</span></div>
              <input aria-label="상품 할인율" type="range" min="0" max="50" value={controls.discountRate} onChange={(event) => updateControl('discountRate', Number(event.target.value))} className="mt-3 w-full accent-[#0F4C3A]" />
              <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-800"><span>0%</span><span>AI 추천 {simulationOption.discountRate}%</span><span>50%</span></div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-600">쿠폰 부담률</span><div className="relative mt-2"><input aria-label="쿠폰 부담률" type="number" min="0" max="30" value={controls.couponRate} onChange={(event) => updateControl('couponRate', Math.min(30, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2 py-2 pr-6 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>
              <label className="block rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-600">H.Point 적립</span><div className="relative mt-2"><input aria-label="H.Point 적립률" type="number" min="0" max="15" value={controls.pointRate} onChange={(event) => updateControl('pointRate', Math.min(15, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2 py-2 pr-6 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-xs font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>%</span></div></label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#0F4C3A]" />무료배송 지원</span><input type="checkbox" checked={controls.freeShipping} onChange={(event) => updateControl('freeShipping', event.target.checked)} className="h-4 w-4 accent-[#0F4C3A]" /></label>
              <label className={`mt-3 block ${controls.freeShipping ? '' : 'opacity-50'}`}><span className="text-[11px] font-semibold text-slate-600">건당 배송비 부담</span><div className="relative mt-2"><input aria-label="건당 배송비 부담" type="number" min="0" max="20000" step="500" disabled={!controls.freeShipping} value={controls.shippingSubsidy} onChange={(event) => updateControl('shippingSubsidy', Math.min(20000, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2 py-2 pr-8 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>원</span></div></label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-600">프로모션 기간</span><div className="relative mt-2"><input aria-label="프로모션 기간" type="number" min="1" max="60" value={controls.campaignDays} onChange={(event) => updateControl('campaignDays', Math.min(60, Math.max(1, Number(event.target.value))))} className="w-full rounded-lg border border-slate-300 px-2 py-2 pr-7 text-xs font-mono font-bold text-slate-900 bg-white outline-none focus:border-[#0F4C3A]" /><span className="absolute right-2 top-2 text-[11px] font-bold text-slate-900" style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}>일</span></div></label>
              <label className="block rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-600">번들 구성</span><div className="mt-2 flex h-8 items-center"><input aria-label="번들 구성" type="checkbox" checked={controls.bundleEnabled} onChange={(event) => updateControl('bundleEnabled', event.target.checked)} className="h-4 w-4 accent-[#0F4C3A]" /><span className="ml-2 text-xs text-slate-600">포함</span></div></label>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">예상 판매량</p><p className="mt-1 text-lg font-bold font-mono text-slate-900">{result.expectedSalesQty}개</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">예상 소진기간</p><p className="mt-1 text-lg font-bold font-mono text-slate-900">{result.liquidationDays}일</p></div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[11px] text-emerald-700">증분 기여현금이익</p><p className="mt-1 text-lg font-bold font-mono text-[#0F4C3A]">{money(result.incrementalContribution)}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">예상 잔여재고</p><p className="mt-1 text-lg font-bold font-mono text-slate-900">{result.remainingQty}개</p></div>
            </div>

            {result.warningMessages.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="flex items-center gap-1.5 text-xs font-bold text-amber-900"><AlertTriangle className="h-4 w-4" />조정안 검토 필요</p>{result.warningMessages.map((warning) => <p key={warning} className="mt-1 text-[11px] text-amber-900">· {warning}</p>)}</div>}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-bold text-slate-900">비용 요약</h3>
                <div className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">고객 결제 매출</span><span className="font-mono font-semibold">₩{result.expectedRevenue.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-slate-500">할인·쿠폰·포인트</span><span className="font-mono font-semibold text-slate-700">-₩{(result.discountCost + result.couponCost + result.pointCost).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-slate-500">배송·플랫폼·운영</span><span className="font-mono font-semibold text-slate-700">-₩{(result.shippingCost + result.platformFee + result.operationCost).toLocaleString()}</span></div><div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-700">회피되는 폐기 비용</span><span className="font-mono font-bold text-[#0F4C3A]">+₩{result.avoidedDisposalCost.toLocaleString()}</span></div></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-xs font-bold text-slate-900">추천 근거</h3><p className="mt-2 text-xs leading-relaxed text-slate-600">{option.reasoning}</p><div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-[11px]"><p className="font-bold text-slate-700">첫 사후 대처 조건</p><p className="mt-1 text-slate-600">{option.fallbackPlan.conditionTrigger}</p><p className="mt-2 font-semibold text-[#0F4C3A]">{option.fallbackPlan.action}</p></div></div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#0F4C3A]/20 bg-emerald-50/70 p-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-[#0F4C3A]">비교함 일괄 시뮬레이션</p><p className="mt-1 text-[11px] text-slate-600">체크한 {compareCount}개 전략을 한 번에 비교하는 화면으로 이동합니다. 선택 수 제한은 없습니다.</p></div><button type="button" onClick={onOpenComparison} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0B392B]"><Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />비교함 전체 실행</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = (params?.id as string) || 'CASE-2026-001';
  const selectedProduct = INVENTORY_PRODUCTS.find((product) => product.id === searchParams.get('productId'));
  const selectedSku = selectedProduct?.skus.find((sku) => sku.id === searchParams.get('skuId'));

  // 시뮬레이션 케이스 데이터
  const caseData = useMemo(() => {
    return MOCK_OPTIMIZATION_CASES.find((c) => c.id === caseId) || MOCK_OPTIMIZATION_CASES[0];
  }, [caseId]);

  // 유형별 2~3개 서브 대안(최선책 + 차선책) 시나리오 카탈로그 데이터
  const scenarioGroups = useMemo(() => {
    return [
      {
        categoryKey: 'PURE_PROFIT',
        categoryName: '🏆 순마진 극대화 시나리오 (3개 대안)',
        description: '취득원가 마진을 최대한 방어하며 폐기손실을 회피하는 최우선 수익 구도',
        options: [
          {
            id: 'OPT-PROFIT-1',
            rankLabel: '1안 (최우선 추천)',
            isBest: true,
            name: '1안: Hmall 타겟 15% 할인 + H.Point 5% 적립',
            discountRate: 15,
            targetChannel: 'Hmall 개인화 추천 기획전',
            expectedNetContributionMargin: 29120000,
            savedDisposalCost: 5760000,
            liquidationDays: 12,
            confidenceScore: 92,
            reasoning: '직매입 취득원가(28만원) 대비 15% 타겟 할인 적용 시 마진을 방어하면서 유연하게 이월 악성 재고의 88%를 12일 내 소진 가능.',
            fallbackPlan: {
              conditionTrigger: '7일 차 소진율 50% 미달 시 (64개 미만 판매)',
              action: '더현대 서울 2F 오프라인 현장 VIP 타겟 쿠폰 추가 발행 (추가 5% 증정)',
              expectedImpact: '최종 소진율 96% 도달 및 폐기 손실 0원 달성',
            },
          },
          {
            id: 'OPT-PROFIT-2',
            rankLabel: '2안 (차선책 1)',
            isBest: false,
            name: '2안: Hmall 모바일 18% 할인 + 무료배송',
            discountRate: 18,
            targetChannel: 'Hmall 모바일 전용 핫딜',
            expectedNetContributionMargin: 27500000,
            savedDisposalCost: 5760000,
            liquidationDays: 10,
            confidenceScore: 89,
            reasoning: '할인율을 3% 높여 소진 기간을 10일로 2일 단축. 순마진은 1안 대비 약 162만원 감소하나 채널 집행 용이.',
            fallbackPlan: {
              conditionTrigger: '5일 차 소진율 60% 미달 시',
              action: '현대백화점 무료 포장 쿠폰 결합 발송',
              expectedImpact: '10일 내 전량 소진',
            },
          },
          {
            id: 'OPT-PROFIT-3',
            rankLabel: '3안 (차선책 2)',
            isBest: false,
            name: '3안: Hmall 12% 쿠폰 + 카테고리 추천 노출',
            discountRate: 12,
            targetChannel: 'Hmall 카테고리 기획전',
            expectedNetContributionMargin: 26100000,
            savedDisposalCost: 5200000,
            liquidationDays: 15,
            confidenceScore: 82,
            reasoning: '할인 폭을 최소화하여 브랜드 가치를 최고 수준으로 보존. 소진 기간 15일 소요.',
            fallbackPlan: {
              conditionTrigger: '10일 차 소진율 50% 미달 시',
              action: '15% 타겟 할인 1안으로 즉시 전환',
              expectedImpact: '목표 순마진 달성',
            },
          },
        ],
      },
      {
        categoryKey: 'FAST_LIQUIDATION',
        categoryName: '⚡ 완판 중심 시나리오 (2개 대안)',
        description: '보관 비용 및 유통기한/시즌 만료를 회피하기 위해 최단기간 청산하는 구도',
        options: [
          {
            id: 'OPT-FAST-1',
            rankLabel: '1안 (완판 최우선)',
            isBest: true,
            name: '1안: Hmall 30% 즉시 타임세일 (4일 완판)',
            discountRate: 30,
            targetChannel: 'Hmall 오늘의 특가',
            expectedNetContributionMargin: 21350000,
            savedDisposalCost: 6525000,
            liquidationDays: 4,
            confidenceScore: 96,
            reasoning: '30% 고할인으로 4일 내 100% 완판 가능하나, 순마진 극대화 1안 대비 기여순이익이 약 777만원 낮음.',
            fallbackPlan: {
              conditionTrigger: '3일 차 소진율 80% 미달 시',
              action: '현대백화점 카드 5% 추가 청구할인',
              expectedImpact: '당일 완판 달성',
            },
          },
          {
            id: 'OPT-FAST-2',
            rankLabel: '2안 (차선책 1)',
            isBest: false,
            name: '2안: Hmall 25% 할인 + 연관상품 묶음 기획전',
            discountRate: 25,
            targetChannel: 'Hmall 그룹사 통합 번들전',
            expectedNetContributionMargin: 22800000,
            savedDisposalCost: 6100000,
            liquidationDays: 6,
            confidenceScore: 91,
            reasoning: '아울렛 채널 이관을 통해 백화점 본점 브랜드 훼손을 방지하며 6일 내 청산.',
            fallbackPlan: {
              conditionTrigger: '4일 차 소진율 60% 미달 시',
              action: '아울렛 현장 추가 5% 스페셜 쿠폰',
              expectedImpact: '6일 완판',
            },
          },
        ],
      },
      {
        categoryKey: 'MAX_REVENUE',
        categoryName: '📈 최대 매출 시나리오 (2개 대안)',
        description: '할인폭을 억제하여 외형 매출액 규모를 높이는 구도',
        options: [
          {
            id: 'OPT-REV-1',
            rankLabel: '1안 (매출 최우선)',
            isBest: true,
            name: '1안: Hmall 10% 전용 쿠폰 + 메인 기획전 노출',
            discountRate: 10,
            targetChannel: 'Hmall 메인 기획전',
            expectedNetContributionMargin: 22400000,
            savedDisposalCost: 4275000,
            liquidationDays: 21,
            confidenceScore: 78,
            reasoning: '할인율을 낮추어 외형 매출액(₩5,557만원)은 크지만 소진 기간이 21일로 길어져 잔여 재고 리스크 잔존.',
            fallbackPlan: {
              conditionTrigger: '14일 차 소진율 60% 미달 시',
              action: '30% 타임세일로 즉시 전환',
              expectedImpact: '잔여재고 전량 일괄 처리',
            },
          },
          {
            id: 'OPT-REV-2',
            rankLabel: '2안 (차선책 1)',
            isBest: false,
            name: '2안: Hmall 12% 우수고객 전용 큐레이션',
            discountRate: 12,
            targetChannel: 'Hmall 우수고객 큐레이션',
            expectedNetContributionMargin: 23500000,
            savedDisposalCost: 4800000,
            liquidationDays: 18,
            confidenceScore: 84,
            reasoning: 'VIP 타겟 큐레이션을 통해 구매력 높은 고객층에 12% 할인 노출.',
            fallbackPlan: {
              conditionTrigger: '12일 차 소진율 50% 미달 시',
              action: 'H.Point 3% 추가 적립 연계',
              expectedImpact: '18일 완판',
            },
          },
        ],
      },
    ];
  }, [caseData]);

  // 전체 평탄화된 모든 대안 옵션 목록
  const allOptions = useMemo(() => {
    return scenarioGroups.flatMap((g) => g.options);
  }, [scenarioGroups]);

  // 카테고리 탭 선택 상태 ('ALL' | 'PURE_PROFIT' | 'FAST_LIQUIDATION' | 'MAX_REVENUE')
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');

  // 시뮬레이션 화면으로 넘길 비교 전략 ID 목록 (기본: 각 유형 최우선 1안)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([
    scenarioGroups[0].options[0].id,
    scenarioGroups[1].options[0].id,
    scenarioGroups[2].options[0].id,
  ]);

  // 카드 목록에서 현재 포커스된 대표 Option ID
  const [activeOptionId, setActiveOptionId] = useState<string>(scenarioGroups[0].options[0].id);
  const [detailOptionId, setDetailOptionId] = useState<string | null>(null);

  const activeOption = useMemo(() => {
    return allOptions.find((o) => o.id === activeOptionId) || allOptions[0];
  }, [allOptions, activeOptionId]);

  const startSimulation = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    const query = new URLSearchParams({ options: uniqueIds.join(',') });
    if (selectedProduct && selectedSku) {
      query.set('productId', selectedProduct.id);
      query.set('skuId', selectedSku.id);
    }
    router.push(`/strategy/${caseId}/simulate?${query.toString()}`);
  };

  // 체크박스 클릭: 카드 라우팅과 독립적으로 비교 대상만 토글
  const toggleCheckbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedOptionIds.includes(id)) {
      if (selectedOptionIds.length > 1) {
        setSelectedOptionIds(selectedOptionIds.filter((item) => item !== id));
      }
    } else {
      setSelectedOptionIds([...selectedOptionIds, id]);
    }
  };

  // 카드 몸통 클릭: 비교 상태를 바꾸지 않고 단일 전략 상세 팝업을 표시
  const handleCardClick = (id: string) => {
    setActiveOptionId(id);
    setDetailOptionId(id);
  };

  const detailOption = detailOptionId ? allOptions.find((option) => option.id === detailOptionId) : null;

  const OPTION_COLORS: Record<string, string> = {
    'OPT-PROFIT-1': '#0F4C3A',
    'OPT-PROFIT-2': '#059669',
    'OPT-PROFIT-3': '#10B981',
    'OPT-FAST-1': '#D97706',
    'OPT-FAST-2': '#F59E0B',
    'OPT-REV-1': '#2563EB',
    'OPT-REV-2': '#3B82F6',
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전 이력 목록으로 돌아가기</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startSimulation([activeOptionId, ...selectedOptionIds.filter((item) => item !== activeOptionId)])}
              className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer bg-[#0F4C3A] hover:bg-[#0B392B] text-white"
            >
              <Sparkles className="w-4 h-4 text-[#9E7C3B]" />
              <span>선택 전략 시뮬레이션 열기</span>
            </button>
          </div>
        </div>

        {/* Case Info Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
              통합재고 AI 전략 케이스 ID: {caseData.id}
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono">생성일시: {caseData.createdAt}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{selectedProduct && selectedSku ? `${selectedProduct.affiliate} ${selectedProduct.name} AI 판매 전략` : caseData.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold">
              대상 품목: {selectedProduct && selectedSku ? `${selectedProduct.name} · ${selectedSku.optionLabel} (${selectedSku.code})` : caseData.targetItems.map((i) => i.name).join(', ')}
            </span>
            {caseData.isBundle && (
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-bold">
                번들 결합 시너지 반영됨
              </span>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'ALL', label: '전체 대안 7개 한눈에 비교' },
              { key: 'PURE_PROFIT', label: '🏆 순마진 극대화 (3개 대안)' },
              { key: 'FAST_LIQUIDATION', label: '⚡ 완판 중심 (2개 대안)' },
              { key: 'MAX_REVENUE', label: '📈 최대 매출 (2개 대안)' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategoryTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === tab.key
                    ? 'bg-[#0F4C3A] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 hidden sm:inline">
            ※ 카드 본문: 시뮬레이션 열기 / 우측 체크: 비교함에 추가·제외
          </span>
        </div>

        {/* Scenario Option Groups List */}
        <div className="space-y-6">
          {scenarioGroups
            .filter((group) => selectedCategoryTab === 'ALL' || group.categoryKey === selectedCategoryTab)
            .map((group) => (
              <div key={group.categoryKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#0F4C3A]" />
                      <span>{group.categoryName}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {group.options.map((opt) => {
                    const isChecked = selectedOptionIds.includes(opt.id);
                    const isActive = activeOptionId === opt.id;
                    const color = OPTION_COLORS[opt.id] || '#0F4C3A';

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleCardClick(opt.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative space-y-3 ${
                          isActive
                            ? 'bg-emerald-50/70 border-2 border-[#0F4C3A] shadow-md ring-2 ring-[#0F4C3A]/20'
                            : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                              {opt.rankLabel}
                            </span>
                            {opt.isBest && (
                              <span className="text-[10px] font-bold text-[#9E7C3B] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                                <Award className="w-3 h-3" />
                                <span>AI 추천</span>
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => toggleCheckbox(opt.id, e)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                              isChecked
                                ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="비교 시뮬레이션 포함/제외 토글"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isChecked ? '비교함 포함' : '비교함 제외'}</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{opt.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">{opt.targetChannel}</p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">추천 할인율:</span>
                            <span className="font-bold text-slate-900 font-mono">{opt.discountRate}% 할인</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">증분 기여순이익:</span>
                            <span className="font-bold text-[#0F4C3A] font-mono">
                              ₩{(opt.expectedNetContributionMargin / 10000).toLocaleString()}만원
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">예상 소진 기간:</span>
                            <span className="font-bold text-slate-800">{opt.liquidationDays}일 완판</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">신뢰도 {opt.confidenceScore}%</span>
                          {isActive ? (
                            <span className="font-bold text-[#0F4C3A] bg-emerald-100 px-2 py-0.5 rounded">● 현재 대표 선택</span>
                          ) : (
                            <span className="text-slate-700 font-bold">클릭 시 시뮬레이션</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#0F4C3A]/20 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[#0F4C3A]">비교 시뮬레이션 준비됨</p>
            <p className="mt-1 text-[11px] text-slate-600">선택한 {selectedOptionIds.length}개 전략의 조건을 시뮬레이션 화면에서 세밀하게 조정할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => startSimulation(selectedOptionIds)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0B392B]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
            비교 시뮬레이션 시작
          </button>
        </div>

        {/* Dynamic Active Scenario Summary */}
        <div className="bg-[#0F4C3A] text-white p-5 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="border-r border-emerald-700/60 last:border-0 pr-2">
            <p className="text-[11px] text-emerald-100">현재 선택된 대표 대안</p>
            <p className="text-base font-bold truncate mt-0.5">{activeOption.name}</p>
          </div>
          <div className="border-r border-emerald-700/60 last:border-0 pr-2">
            <p className="text-[11px] text-emerald-100">예상 증분 기여순이익</p>
            <p className="text-xl font-bold font-mono text-[#C5A059] mt-0.5">
              ₩{(activeOption.expectedNetContributionMargin / 10000).toLocaleString()}만원
            </p>
          </div>
          <div className="border-r border-emerald-700/60 last:border-0 pr-2">
            <p className="text-[11px] text-emerald-100">예상 완판 소진 기간</p>
            <p className="text-xl font-bold mt-0.5">{activeOption.liquidationDays}일 이내</p>
          </div>
          <div>
            <p className="text-[11px] text-emerald-100">회피되는 폐기 손실액</p>
            <p className="text-xl font-bold font-mono text-emerald-200 mt-0.5">
              +₩{(activeOption.savedDisposalCost / 10000).toLocaleString()}만원
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs">
          <p className="font-bold text-slate-900">차트와 사후 대처는 시뮬레이션 화면으로 이동했습니다.</p>
          <p className="mt-1 text-xs leading-relaxed">카드를 클릭하면 해당 전략만 상세 팝업으로 시뮬레이션하고, 비교함에 추가한 전략은 개수 제한 없이 일괄 비교할 수 있습니다.</p>
        </div>
        {detailOption && (
          <StrategyDetailModal
            option={detailOption}
            compareCount={selectedOptionIds.length}
            onClose={() => setDetailOptionId(null)}
            onOpenComparison={() => {
              setDetailOptionId(null);
              startSimulation(selectedOptionIds);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
