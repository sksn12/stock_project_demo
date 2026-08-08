export type StrategyTargetType = 'SKU' | 'BUNDLE';
export type StrategyGoal = 'FAST' | 'MARGIN' | 'REVENUE';
export type StrategyStatus = 'APPROVED' | 'APPROVING' | 'READY' | 'GENERATING';

export interface StrategyHistoryRow {
  id: string;
  caseId: string;
  type: '개별' | '번들';
  title: string;
  affiliate: string;
  category: string;
  productName: string;
  status: StrategyStatus;
  createdAt: string;
  href?: string;
}

export interface StrategySubject {
  targetType: StrategyTargetType;
  code: string;
  name: string;
  category: string;
  affiliate: string;
  inventoryQty: number;
  unit: string;
  sellingPrice: number;
  forecast14Days: number;
  expiryDays: number;
}

export interface StrategyCandidate {
  id: string;
  goal: StrategyGoal;
  rank: 1 | 2 | 3;
  badge: string;
  title: string;
  summary: string;
  channels: string;
  baseDiscountRate: number;
  baseCampaignDays: number;
  baseAppliedQuantity: number;
  baseBenefitRate: number;
  basePromotionCost: number;
  freeShipping: boolean;
  demandMultiplier: number;
  benefit: string;
  risk: string;
}

export interface StrategyControls {
  appliedQuantity: number;
  discountRate: number;
  campaignDays: number;
  benefitRate: number;
  promotionCost: number;
  freeShipping: boolean;
}

export interface StrategyResult {
  expectedSales: number;
  expectedRevenue: number;
  variableCost: number;
  contributionProfit: number;
  contributionMarginRate: number;
  sellThroughRate: number;
  liquidationDays: number;
  remainingQty: number;
}

export const GOAL_META: Record<StrategyGoal, { label: string; description: string }> = {
  FAST: { label: '빠른 완판', description: '재고 위험과 판매 가능 기간을 우선합니다.' },
  MARGIN: { label: '마진 극대화', description: '할인 비용을 줄이고 공헌이익을 방어합니다.' },
  REVENUE: { label: '최대 매출', description: '채널 도달 범위와 총 판매량을 확대합니다.' },
};

const STRATEGY_TEMPLATES: Array<Omit<StrategyCandidate, 'baseAppliedQuantity'>> = [
  { id: 'WF-FAST-1', goal: 'FAST', rank: 1, badge: '복합 전략', title: '여유 채널 재고 이동 후 10% 집중 판매', summary: '과잉 위치 재고를 수요 채널로 전환하고 단기 프로모션을 적용합니다.', channels: '재고 이동 80 · 행사 10일', baseDiscountRate: 10, baseCampaignDays: 10, baseBenefitRate: 0, basePromotionCost: 420000, freeShipping: false, demandMultiplier: 1.34, benefit: '판매 수요 점포의 품절 위험 해소', risk: '이동비와 행사비가 함께 발생' },
  { id: 'WF-FAST-2', goal: 'FAST', rank: 2, badge: '온라인 프로모션', title: '그리팅몰 15% 기간 한정 타임딜', summary: '온라인 수요에 집중해 짧은 기간 내 판매 속도를 높입니다.', channels: '그리팅몰 · 7일 · 쿠폰 5%', baseDiscountRate: 15, baseCampaignDays: 7, baseBenefitRate: 5, basePromotionCost: 680000, freeShipping: true, demandMultiplier: 1.28, benefit: '빠른 온라인 소진 가능', risk: '할인과 배송비 부담 증가' },
  { id: 'WF-FAST-3', goal: 'FAST', rank: 3, badge: '오프라인 집약', title: '저판매 점포 재고 집약 후 특별 행사', summary: '소량 분산재고를 행사 점포로 모아 일괄 판매합니다.', channels: '5개 점포 → 1개 행사점 · 5일', baseDiscountRate: 20, baseCampaignDays: 5, baseBenefitRate: 0, basePromotionCost: 520000, freeShipping: false, demandMultiplier: 1.18, benefit: '분산 재고를 단기간에 정리', risk: '행사 운영비와 이동비 발생' },
  { id: 'WF-MARGIN-1', goal: 'MARGIN', rank: 1, badge: '재고 이동', title: '고수요 판매처로 무할인 물량 집중', summary: '가격을 유지하고 판매 속도가 높은 채널에 재고를 재배정합니다.', channels: '2개 판매처 · 할인 없음', baseDiscountRate: 0, baseCampaignDays: 14, baseBenefitRate: 0, basePromotionCost: 180000, freeShipping: false, demandMultiplier: 1.16, benefit: '가격 인하 없이 판매 가능', risk: '저수요 위치의 잔여재고 존재' },
  { id: 'WF-MARGIN-2', goal: 'MARGIN', rank: 2, badge: '저할인 판매', title: '그리팅몰 저할인 장기 판매', summary: '낮은 할인으로 마진을 방어하며 판매 기간을 늘립니다.', channels: '할인 5% · 21일 · 배너 미사용', baseDiscountRate: 5, baseCampaignDays: 21, baseBenefitRate: 0, basePromotionCost: 120000, freeShipping: false, demandMultiplier: 1.05, benefit: '낮은 비용으로 마진 방어', risk: '판매 종료까지 기간이 김' },
  { id: 'WF-MARGIN-3', goal: 'MARGIN', rank: 3, badge: '교차판매', title: '연관상품 교차판매 쿠폰', summary: '기존 구매 고객에게 제한 쿠폰을 제공해 추가 수요를 만듭니다.', channels: '연관 구매 시 8% 쿠폰 · 18일', baseDiscountRate: 8, baseCampaignDays: 18, baseBenefitRate: 0, basePromotionCost: 260000, freeShipping: false, demandMultiplier: 1.0, benefit: '마진과 객단가를 함께 방어', risk: '완판 가능성은 상대적으로 낮음' },
  { id: 'WF-REVENUE-1', goal: 'REVENUE', rank: 1, badge: '다채널 판촉', title: '3개 채널 동시 프로모션', summary: '온라인과 오프라인 채널을 동시에 운영해 도달 범위를 넓힙니다.', channels: '백화점 · 그리팅몰 · 외부몰 · 12일', baseDiscountRate: 12, baseCampaignDays: 12, baseBenefitRate: 3, basePromotionCost: 940000, freeShipping: true, demandMultiplier: 1.46, benefit: '가장 높은 예상 매출', risk: '광고·쿠폰 비용 증가' },
  { id: 'WF-REVENUE-2', goal: 'REVENUE', rank: 2, badge: '번들 전략', title: '프리미엄 연관상품 번들 구성', summary: '연관 SKU를 함께 판매해 객단가와 판매량을 높입니다.', channels: '3종 세트 · 객단가 상승 · 14일', baseDiscountRate: 9, baseCampaignDays: 14, baseBenefitRate: 0, basePromotionCost: 720000, freeShipping: true, demandMultiplier: 1.3, benefit: '객단가와 연관상품 매출 증가', risk: '번들 구성과 포장 검토 필요' },
  { id: 'WF-REVENUE-3', goal: 'REVENUE', rank: 3, badge: '오프라인 판촉', title: '주말 백화점 집중 타임딜', summary: '주말 방문 수요가 높은 점포에 물량과 혜택을 집중합니다.', channels: '상위 4개점 · 할인 18% · 주말 2회', baseDiscountRate: 18, baseCampaignDays: 9, baseBenefitRate: 0, basePromotionCost: 610000, freeShipping: false, demandMultiplier: 1.36, benefit: '단기 매출과 소진율 동시 확보', risk: '주말 수요 의존도가 높음' },
];

export function buildStrategyCandidates(subject: StrategySubject): StrategyCandidate[] {
  const ratios = [0.64, 0.6, 0.57, 0.55, 0.5, 0.48, 0.7, 0.59, 0.63];
  return STRATEGY_TEMPLATES.map((template, index) => ({
    ...template,
    title: subject.targetType === 'BUNDLE' && template.id === 'WF-REVENUE-2' ? '번들 대표상품 다채널 확장' : template.title,
    baseAppliedQuantity: Math.max(1, Math.min(subject.inventoryQty, Math.round(subject.inventoryQty * ratios[index]))),
  }));
}

export function getDefaultStrategyControls(candidate: StrategyCandidate): StrategyControls {
  return {
    appliedQuantity: candidate.baseAppliedQuantity,
    discountRate: candidate.baseDiscountRate,
    campaignDays: candidate.baseCampaignDays,
    benefitRate: candidate.baseBenefitRate,
    promotionCost: candidate.basePromotionCost,
    freeShipping: candidate.freeShipping,
  };
}

export function simulateStrategy(subject: StrategySubject, candidate: StrategyCandidate, controls: StrategyControls): StrategyResult {
  const discountBoost = Math.max(-0.25, (controls.discountRate - candidate.baseDiscountRate) * 0.018);
  const periodBoost = Math.max(0.6, Math.pow(controls.campaignDays / Math.max(1, candidate.baseCampaignDays), 0.35));
  const benefitBoost = controls.benefitRate * 0.012;
  const shippingBoost = controls.freeShipping ? 0.08 : 0;
  const rawDemand = controls.appliedQuantity * candidate.demandMultiplier * (1 + discountBoost + benefitBoost + shippingBoost) * periodBoost;
  const expectedSales = Math.max(0, Math.min(subject.inventoryQty, controls.appliedQuantity, Math.round(rawDemand)));
  const unitRevenue = subject.sellingPrice * (1 - controls.discountRate / 100);
  const expectedRevenue = Math.round(expectedSales * unitRevenue);
  const productCost = Math.round(expectedSales * subject.sellingPrice * (subject.targetType === 'BUNDLE' ? 0.66 : 0.61));
  const benefitCost = Math.round(expectedRevenue * controls.benefitRate / 100);
  const shippingCost = controls.freeShipping ? expectedSales * 2800 : 0;
  const operationCost = expectedSales * (subject.targetType === 'BUNDLE' ? 1100 : 450);
  const variableCost = productCost + benefitCost + shippingCost + operationCost + controls.promotionCost;
  const contributionProfit = expectedRevenue - variableCost;
  const contributionMarginRate = expectedRevenue > 0 ? Math.round(contributionProfit / expectedRevenue * 1000) / 10 : 0;
  const remainingQty = Math.max(0, subject.inventoryQty - expectedSales);
  const sellThroughRate = subject.inventoryQty > 0 ? Math.round(expectedSales / subject.inventoryQty * 1000) / 10 : 0;
  const liquidationDays = Math.max(1, Math.round(subject.inventoryQty / Math.max(1, expectedSales / controls.campaignDays)));
  return { expectedSales, expectedRevenue, variableCost, contributionProfit, contributionMarginRate, sellThroughRate, liquidationDays, remainingQty };
}

export const STRATEGY_HISTORY_ROWS: StrategyHistoryRow[] = [
  { id: 'ST-2026-028', caseId: 'CASE-2026-001', type: '개별', title: '저당 국·탕 판교점 재할당 전략', affiliate: '현대그린푸드', category: '케어푸드', productName: '버섯 들깨탕 6팩', status: 'APPROVING', createdAt: '2026.08.07' },
  { id: 'ST-2026-027', caseId: 'CASE-2026-002', type: '번들', title: '그리팅 든든 한상 번들 전략', affiliate: '현대그린푸드', category: '번들', productName: '도시락 + 저당 국·탕 외 1건', status: 'READY', createdAt: '2026.08.06' },
  { id: 'ST-2026-025', caseId: 'OPT-FAST-1', type: '개별', title: '오프라인 재고 재할당 전략', affiliate: '현대그린푸드', category: '도시락', productName: '두부버섯 도시락 350g', status: 'GENERATING', createdAt: '2026.08.04' },
  { id: 'ST-2026-024', caseId: 'OPT-REV-1', type: '번들', title: '프리미엄 케어푸드 번들 전략', affiliate: '현대그린푸드', category: '번들', productName: '영양균형 도시락 외 2건', status: 'READY', createdAt: '2026.08.03' },
];
