export type SimulationType = 'PURE_PROFIT' | 'FAST_LIQUIDATION' | 'MAX_REVENUE';

export interface SimulationOption {
  id: string;
  type: SimulationType;
  categoryLabel: string;
  rankLabel: string;
  name: string;
  targetChannel: string;
  discountRate: number;
  expectedSalesQty: number;
  expectedRevenue: number;
  expectedNetContributionMargin: number;
  savedDisposalCost: number;
  liquidationDays: number;
  confidenceScore: number;
  reasoning: string;
  inventoryQty: number;
  sellingPrice: number;
  costPrice: number;
}

export interface SimulationControls {
  discountRate: number;
  couponRate: number;
  pointRate: number;
  shippingSubsidy: number;
  freeShipping: boolean;
  campaignDays: number;
  appliedQuantity: number;
  bundleEnabled: boolean;
  bundleDiscountRate: number;
  adBudget: number;
  onlineShareRate: number;
  returnRate: number;
  packingCostPerUnit: number;
  bundleAssemblyCost: number;
  storageCostPerUnitDay: number;
  disposalCostPerUnit: number;
}

export interface SimulationResult {
  expectedSalesQty: number;
  expectedRevenue: number;
  grossRevenue: number;
  discountCost: number;
  couponCost: number;
  pointCost: number;
  shippingCost: number;
  platformFee: number;
  operationCost: number;
  returnCost: number;
  storageCost: number;
  avoidedDisposalCost: number;
  baselineContribution: number;
  incrementalContribution: number;
  remainingQty: number;
  liquidationDays: number;
  confidenceScore: number;
  warningMessages: string[];
}

export interface FallbackStep {
  id: string;
  level: string;
  range: string;
  checkpoint: string;
  trigger: string;
  action: string;
  expectedImpact: string;
  tone: 'normal' | 'watch' | 'adjust' | 'urgent' | 'protect';
}

export const SIMULATION_OPTIONS: SimulationOption[] = [
  {
    id: 'OPT-PROFIT-1', type: 'PURE_PROFIT', categoryLabel: '순마진 극대화', rankLabel: '1안 (최우선 추천)',
    name: 'Hmall 타겟 15% 할인 + H.Point 5% 적립', targetChannel: 'Hmall 개인화 추천 기획전',
    discountRate: 15, expectedSalesQty: 128, expectedRevenue: 70720000, expectedNetContributionMargin: 29120000,
    savedDisposalCost: 5760000, liquidationDays: 12, confidenceScore: 92,
    reasoning: '타겟 할인으로 마진을 방어하면서 이월 악성재고를 12일 내 소진하는 구도입니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-PROFIT-2', type: 'PURE_PROFIT', categoryLabel: '순마진 극대화', rankLabel: '2안 (차선책 1)',
    name: 'Hmall 모바일 18% 할인 + 무료배송', targetChannel: 'Hmall 모바일 전용 핫딜',
    discountRate: 18, expectedSalesQty: 132, expectedRevenue: 70400000, expectedNetContributionMargin: 27500000,
    savedDisposalCost: 5760000, liquidationDays: 10, confidenceScore: 89,
    reasoning: '할인 폭을 높여 소진 기간을 단축하되 무료배송 비용을 함께 검토하는 대안입니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-PROFIT-3', type: 'PURE_PROFIT', categoryLabel: '순마진 극대화', rankLabel: '3안 (차선책 2)',
    name: 'Hmall 12% 쿠폰 + 카테고리 추천 노출', targetChannel: 'Hmall 카테고리 기획전',
    discountRate: 12, expectedSalesQty: 112, expectedRevenue: 69500000, expectedNetContributionMargin: 26100000,
    savedDisposalCost: 5200000, liquidationDays: 15, confidenceScore: 82,
    reasoning: '할인 폭을 억제해 브랜드 가치를 보존하고 오프라인 노출로 수요를 보완합니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-FAST-1', type: 'FAST_LIQUIDATION', categoryLabel: '완판 중심', rankLabel: '1안 (완판 최우선)',
    name: 'Hmall 30% 즉시 타임세일 (4일 완판)', targetChannel: 'Hmall 오늘의 특가',
    discountRate: 30, expectedSalesQty: 145, expectedRevenue: 66062500, expectedNetContributionMargin: 21350000,
    savedDisposalCost: 6525000, liquidationDays: 4, confidenceScore: 96,
    reasoning: '고할인으로 가장 빠르게 재고를 소진하지만 순마진 감소를 감수하는 대안입니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-FAST-2', type: 'FAST_LIQUIDATION', categoryLabel: '완판 중심', rankLabel: '2안 (차선책 1)',
    name: 'Hmall 25% 할인 + 연관상품 묶음 기획전', targetChannel: 'Hmall 그룹사 통합 번들전',
    discountRate: 25, expectedSalesQty: 140, expectedRevenue: 68250000, expectedNetContributionMargin: 22800000,
    savedDisposalCost: 6100000, liquidationDays: 6, confidenceScore: 91,
    reasoning: '채널을 분리해 본점 브랜드 훼손을 줄이고 번들로 단기간 청산합니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-REV-1', type: 'MAX_REVENUE', categoryLabel: '최대 매출', rankLabel: '1안 (매출 최우선)',
    name: 'Hmall 10% 전용 쿠폰 + 메인 기획전 노출', targetChannel: 'Hmall 메인 기획전',
    discountRate: 10, expectedSalesQty: 95, expectedRevenue: 55575000, expectedNetContributionMargin: 22400000,
    savedDisposalCost: 4275000, liquidationDays: 21, confidenceScore: 78,
    reasoning: '외형 매출을 높이지만 소진 기간이 길어 잔여재고 리스크가 남는 대안입니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
  {
    id: 'OPT-REV-2', type: 'MAX_REVENUE', categoryLabel: '최대 매출', rankLabel: '2안 (차선책 1)',
    name: 'Hmall 12% 우수고객 전용 큐레이션', targetChannel: 'Hmall 우수고객 큐레이션',
    discountRate: 12, expectedSalesQty: 102, expectedRevenue: 57400000, expectedNetContributionMargin: 23500000,
    savedDisposalCost: 4800000, liquidationDays: 18, confidenceScore: 84,
    reasoning: '구매력 높은 VIP 고객층에 제한적으로 혜택을 노출하는 대안입니다.',
    inventoryQty: 145, sellingPrice: 650000, costPrice: 280000,
  },
];

export function getSimulationOption(id: string | null | undefined): SimulationOption | undefined {
  return SIMULATION_OPTIONS.find((option) => option.id === id);
}

export function getDefaultControls(option: SimulationOption): SimulationControls {
  const defaults: Record<string, Partial<SimulationControls>> = {
    'OPT-PROFIT-1': { pointRate: 5 },
    'OPT-PROFIT-2': { freeShipping: true, shippingSubsidy: 3500 },
    'OPT-PROFIT-3': { couponRate: 12 },
    'OPT-FAST-1': {},
    'OPT-FAST-2': { bundleEnabled: true, bundleDiscountRate: 10 },
    'OPT-REV-1': { couponRate: 10 },
    'OPT-REV-2': {},
  };

  return {
    discountRate: option.discountRate,
    couponRate: 0,
    pointRate: 0,
    shippingSubsidy: 0,
    freeShipping: false,
    campaignDays: option.liquidationDays,
    appliedQuantity: option.inventoryQty,
    bundleEnabled: false,
    bundleDiscountRate: 0,
    adBudget: 0,
    onlineShareRate: 60,
    returnRate: 2.5,
    packingCostPerUnit: 4200,
    bundleAssemblyCost: 1800,
    storageCostPerUnitDay: 160,
    disposalCostPerUnit: Math.round(option.savedDisposalCost / option.inventoryQty),
    ...defaults[option.id],
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function simulateOption(option: SimulationOption, controls: SimulationControls): SimulationResult {
  const defaults = getDefaultControls(option);
  const benefitRate = controls.discountRate + controls.couponRate + controls.pointRate + (controls.bundleEnabled ? controls.bundleDiscountRate * 0.55 : 0);
  const baseBenefitRate = defaults.discountRate + defaults.couponRate + defaults.pointRate + (defaults.bundleEnabled ? defaults.bundleDiscountRate * 0.55 : 0);
  const demandFactor = clamp(
    1 + (benefitRate - baseBenefitRate) * 0.018 + (controls.campaignDays - defaults.campaignDays) * 0.009 + (controls.freeShipping ? 0.055 : 0) + (controls.bundleEnabled ? 0.06 : 0) + Math.min(0.1, controls.adBudget / 1000000 * 0.02),
    0.62,
    1.42,
  );
  const expectedSalesQty = Math.min(controls.appliedQuantity, Math.max(0, Math.round(option.expectedSalesQty * demandFactor)));
  const grossRevenue = expectedSalesQty * option.sellingPrice;
  const discountCost = Math.round(grossRevenue * controls.discountRate / 100);
  const couponCost = Math.round(grossRevenue * controls.couponRate / 100);
  const pointCost = Math.round(grossRevenue * controls.pointRate / 100);
  const bundleCost = controls.bundleEnabled ? expectedSalesQty * controls.bundleAssemblyCost : 0;
  const onlineShare = controls.onlineShareRate / 100;
  const shippingCost = controls.freeShipping ? expectedSalesQty * controls.shippingSubsidy * onlineShare : expectedSalesQty * Math.round(controls.shippingSubsidy * 0.25) * onlineShare;
  const expectedRevenue = Math.max(0, grossRevenue - discountCost - couponCost - pointCost);
  const platformFee = Math.round(expectedRevenue * 0.032);
  const operationCost = expectedSalesQty * controls.packingCostPerUnit;
  const returnCost = Math.round(expectedRevenue * controls.returnRate / 100);
  const storageCost = Math.max(0, controls.campaignDays - option.liquidationDays) * controls.appliedQuantity * controls.storageCostPerUnitDay;
  const avoidedDisposalCost = Math.round(controls.disposalCostPerUnit * expectedSalesQty);
  const rawContribution = expectedRevenue - expectedSalesQty * option.costPrice - platformFee - shippingCost - operationCost - bundleCost - returnCost - storageCost - controls.adBudget + avoidedDisposalCost;
  const baseContribution = option.expectedNetContributionMargin * 0.62;
  const defaultRaw = option.expectedSalesQty * option.sellingPrice * (1 - (defaults.discountRate + defaults.couponRate + defaults.pointRate) / 100)
    - option.expectedSalesQty * option.costPrice - Math.round(option.expectedSalesQty * option.sellingPrice * 0.032) - option.expectedSalesQty * defaults.packingCostPerUnit + option.savedDisposalCost;
  const normalizedFactor = defaultRaw > 0 ? rawContribution / defaultRaw : 1;
  const incrementalContribution = Math.round(option.expectedNetContributionMargin * clamp(normalizedFactor, 0.35, 1.35));
  const remainingQty = Math.max(0, option.inventoryQty - expectedSalesQty);
  const liquidationDays = Math.max(1, Math.round(option.liquidationDays * (option.expectedSalesQty / Math.max(expectedSalesQty, 1)) * (1 + Math.max(0, controls.campaignDays - defaults.campaignDays) * 0.015)));
  const confidenceScore = Math.round(clamp(option.confidenceScore - Math.abs(benefitRate - baseBenefitRate) * 0.35 - (controls.bundleEnabled ? 2 : 0), 52, 98));
  const warningMessages: string[] = [];

  if (incrementalContribution < baseContribution) warningMessages.push('AI 추천 원본보다 증분 기여현금이익이 낮아졌습니다.');
  if (controls.discountRate > 40) warningMessages.push('권장 최대 할인율 40%를 초과했습니다. 담당자 승인이 필요합니다.');
  if (remainingQty > option.inventoryQty * 0.35) warningMessages.push('예상 잔여재고가 전체의 35%를 초과합니다. 사후 대처 단계를 확인하세요.');
  if (liquidationDays > controls.campaignDays + 7) warningMessages.push('프로모션 기간 안에 전량 소진되지 않을 가능성이 있습니다.');
  if (shippingCost > incrementalContribution * 0.12) warningMessages.push('배송비 지원액이 증분 기여이익의 12%를 초과합니다.');
  if (controls.adBudget > incrementalContribution * 0.1) warningMessages.push('광고·노출 예산이 증분 기여이익의 10%를 초과합니다.');
  if (controls.returnRate > 8) warningMessages.push('반품률 가정이 8%를 초과합니다. 판매 채널과 상품 특성을 다시 확인하세요.');

  return {
    expectedSalesQty, expectedRevenue, grossRevenue, discountCost, couponCost, pointCost, shippingCost, platformFee,
    operationCost: operationCost + bundleCost, returnCost, storageCost, avoidedDisposalCost,
    baselineContribution: Math.round(baseContribution), incrementalContribution, remainingQty, liquidationDays,
    confidenceScore, warningMessages,
  };
}

export function buildSimulationFallback(option: SimulationOption, controls: SimulationControls, result: SimulationResult): FallbackStep[] {
  const additionalDiscounts = [0, 3, 5, 8, 12];
  const bands = [
    { level: '정상 유지', range: '90–100%', ratio: 0.2, tone: 'normal' as const, trigger: '계획 대비 누적 판매 달성률 90% 이상' },
    { level: '1차 보정', range: '70–89%', ratio: 0.4, tone: 'watch' as const, trigger: '계획 대비 누적 판매 달성률 70–89%' },
    { level: '2차 보정', range: '50–69%', ratio: 0.6, tone: 'adjust' as const, trigger: '계획 대비 누적 판매 달성률 50–69%' },
    { level: '강화 전환', range: '30–49%', ratio: 0.8, tone: 'urgent' as const, trigger: '계획 대비 누적 판매 달성률 30–49%' },
    { level: '손실 방어', range: '0–29%', ratio: 1, tone: 'protect' as const, trigger: '계획 대비 누적 판매 달성률 0–29%' },
  ];
  const day = (ratio: number) => Math.max(1, Math.round(Math.max(1, result.liquidationDays) * ratio));
  const action = option.type === 'FAST_LIQUIDATION'
    ? ['현재 타임세일 노출 유지', '앱 핫딜 노출면 확대', '카드 청구할인 5% 추가', '아울렛·번들 전환', '회수·기부·폐기 대안 승인']
    : option.type === 'MAX_REVENUE'
      ? ['전시·전용 쿠폰 유지', 'VIP 큐레이션 재노출', 'H.Point 3% 추가 적립', '30% 타임세일 또는 번들 전환', '잔여재고 처분 대안 승인']
      : ['현재 타겟 할인 유지', '타겟 채널 노출 보강', '추가 5% 제한 쿠폰', '저마진 번들·무료배송 병행', '추가 할인 중단 후 처분 대안 승인'];
  return bands.map((band, index) => ({
    id: `${option.id}-sim-fallback-${index}`,
    level: band.level,
    range: band.range,
    checkpoint: `${day(band.ratio)}일 차 체크포인트`,
    trigger: band.trigger,
    action: `${action[index]}${additionalDiscounts[index] ? ` · 누적 할인 ${Math.min(50, controls.discountRate + additionalDiscounts[index])}%까지` : ''}`,
    expectedImpact: index === 0 ? `현재 조정안의 증분 기여이익 ₩${Math.round(result.incrementalContribution / 10000).toLocaleString()}만원 방어` : index === 4 ? '판매보다 회피 손실이 유리한지 비교 후 담당자 승인' : '잔여재고와 하방 손실을 줄이고 다음 구간을 재평가',
    tone: band.tone,
  }));
}
