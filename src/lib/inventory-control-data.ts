export type InventoryAffiliate = '현대그린푸드' | '현대웰니스' | '현대리바트';

export type SkuRiskStatus = 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';

export interface InventorySku {
  id: string;
  code: string;
  optionLabel: string;
  options: Record<string, string>;
  stock: number;
  availableStock: number;
  reservedStock: number;
  unit: string;
  sellingPrice: number;
  storageDays: number;
  expiryLabel: string;
  salesVelocity: number;
  riskStatus: SkuRiskStatus;
  riskScore: number;
  riskReason: string;
  location: string;
  updatedAt: string;
}

export interface InventoryLot {
  id: string;
  receivedAt: string;
  expiryDate?: string;
  expiryLabel: string;
  nearExpiryStartDate?: string;
  saleStopDate?: string;
  expectedRemainingAtSaleStop?: number;
  traceabilityCode?: string;
  manufacturer?: string;
  recallStatus?: 'CLEAR' | 'RECALL';
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  location: string;
  status: 'PRIORITY' | 'NORMAL' | 'HOLD';
  note: string;
}

export interface SkuOperationData {
  imageUrl: string;
  imageAlt: string;
  lots: InventoryLot[];
}

export interface InventoryProduct {
  id: string;
  productCode: string;
  name: string;
  affiliate: InventoryAffiliate;
  category: string;
  brand: string;
  channel: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  updatedAt: string;
  skus: InventorySku[];
}

export interface InventoryStrategyHistory {
  id: string;
  productId: string;
  skuIds: string[];
  title: string;
  createdAt: string;
  status: 'APPROVED' | 'EXECUTING' | 'FINISHED';
  strategyType: string;
  discountRate: number;
  channel: string;
  predictedSales: number;
  actualSales?: number;
  expectedProfit: number;
  actualProfit?: number;
  summary: string;
}

export interface BundleRecommendation {
  productId: string;
  reason: string;
  fitScore: number;
}

export interface InventoryStrategyOutcome {
  strategyId: string;
  beforeStock: number;
  afterStock?: number;
  targetSellThrough: number;
  actualSellThrough?: number;
  resultLabel: string;
  resultSummary: string;
  timeline: Array<{
    date: string;
    label: string;
    state: 'DONE' | 'CURRENT' | 'UPCOMING';
  }>;
}

export const AFFILIATE_META: Record<InventoryAffiliate, {
  shortName: string;
  accent: string;
  soft: string;
  border: string;
  description: string;
}> = {
  현대그린푸드: {
    shortName: 'GREEN FOOD',
    accent: 'text-emerald-700',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: '식품·밀키트·신선상품',
  },
  현대웰니스: {
    shortName: 'WELLNESS',
    accent: 'text-sky-700',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    description: '건강기능식품·웰니스',
  },
  현대리바트: {
    shortName: 'LIVART',
    accent: 'text-amber-700',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    description: '가구·홈리빙',
  },
};

export const RISK_META: Record<SkuRiskStatus, { label: string; className: string }> = {
  SAFE: { label: '정상', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  CAUTION: { label: '주의', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  WARNING: { label: '위험', className: 'border-orange-200 bg-orange-50 text-orange-700' },
  CRITICAL: { label: '긴급', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

export const INVENTORY_PRODUCTS: InventoryProduct[] = [
  {
    id: 'GF-P-001',
    productCode: 'GF-MEAL-001',
    name: '그리팅 건강식단 균형식 세트',
    affiliate: '현대그린푸드',
    category: '케어푸드/밀키트',
    brand: '그리팅',
    channel: '그리팅몰 · 단체급식몰',
    description: '영양 균형을 고려한 냉장 간편식 세트로 구성과 배송 주기별 SKU를 별도로 관리합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '신선한 채소와 건강식으로 구성된 균형식',
    updatedAt: '2026.08.02 09:00',
    skus: [
      {
        id: 'GF-SKU-001', code: 'GF-MEAL-6-CH', optionLabel: '6팩 · 냉장',
        options: { 구성: '6팩', 보관: '냉장', 배송: '일반배송' },
        stock: 284, availableStock: 250, reservedStock: 34, unit: '세트', sellingPrice: 54900,
        storageDays: 8, expiryLabel: 'D-5', salesVelocity: 18.4, riskStatus: 'WARNING', riskScore: 74,
        riskReason: '가용재고 대비 남은 소비기한이 짧아 5일 내 우선 소진이 필요합니다.',
        location: '경기 광주 냉장센터 A-04', updatedAt: '2026.08.02 09:00',
      },
      {
        id: 'GF-SKU-002', code: 'GF-MEAL-12-CH', optionLabel: '12팩 · 냉장',
        options: { 구성: '12팩', 보관: '냉장', 배송: '새벽배송' },
        stock: 126, availableStock: 118, reservedStock: 8, unit: '세트', sellingPrice: 99900,
        storageDays: 5, expiryLabel: 'D-9', salesVelocity: 23.1, riskStatus: 'SAFE', riskScore: 28,
        riskReason: '최근 판매속도 기준 소비기한 이전 정상 소진이 예상됩니다.',
        location: '경기 광주 냉장센터 A-05', updatedAt: '2026.08.02 09:00',
      },
      {
        id: 'GF-SKU-003', code: 'GF-MEAL-6-FR', optionLabel: '6팩 · 냉동',
        options: { 구성: '6팩', 보관: '냉동', 배송: '일반배송' },
        stock: 462, availableStock: 435, reservedStock: 27, unit: '세트', sellingPrice: 51900,
        storageDays: 62, expiryLabel: 'D-42', salesVelocity: 8.2, riskStatus: 'CAUTION', riskScore: 51,
        riskReason: '소비기한은 충분하지만 최근 14일 판매속도가 21% 감소했습니다.',
        location: '경기 광주 냉동센터 F-11', updatedAt: '2026.08.02 09:00',
      },
    ],
  },
  {
    id: 'GF-P-002',
    productCode: 'GF-SALAD-014',
    name: '그리팅 프리미엄 샐러드 위클리팩',
    affiliate: '현대그린푸드',
    category: '신선식품/샐러드',
    brand: '그리팅',
    channel: '그리팅몰 · Hmall',
    description: '원물 구성과 드레싱 타입에 따라 소비기한과 판매 가능 재고를 독립 관리하는 신선상품입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '신선한 채소로 구성된 프리미엄 샐러드',
    updatedAt: '2026.08.02 09:00',
    skus: [
      {
        id: 'GF-SKU-004', code: 'GF-SAL-GRN-05', optionLabel: '그린믹스 · 5팩',
        options: { 구성: '5팩', 드레싱: '발사믹', 보관: '냉장' },
        stock: 190, availableStock: 172, reservedStock: 18, unit: '세트', sellingPrice: 42500,
        storageDays: 4, expiryLabel: 'D-2', salesVelocity: 12.2, riskStatus: 'CRITICAL', riskScore: 93,
        riskReason: '소비기한 D-2이며 현재 속도라면 148세트가 잔존할 것으로 예상됩니다.',
        location: '경기 광주 신선센터 C-02', updatedAt: '2026.08.02 09:00',
      },
      {
        id: 'GF-SKU-005', code: 'GF-SAL-CHK-05', optionLabel: '닭가슴살 · 5팩',
        options: { 구성: '5팩', 토핑: '닭가슴살', 보관: '냉장' },
        stock: 84, availableStock: 71, reservedStock: 13, unit: '세트', sellingPrice: 47500,
        storageDays: 3, expiryLabel: 'D-4', salesVelocity: 19.6, riskStatus: 'CAUTION', riskScore: 46,
        riskReason: '예약재고를 제외하면 정상 소진 범위이나 일별 모니터링이 필요합니다.',
        location: '경기 광주 신선센터 C-03', updatedAt: '2026.08.02 09:00',
      },
      {
        id: 'GF-SKU-006', code: 'GF-SAL-SLM-05', optionLabel: '연어 · 5팩',
        options: { 구성: '5팩', 토핑: '훈제연어', 보관: '냉장' },
        stock: 58, availableStock: 44, reservedStock: 14, unit: '세트', sellingPrice: 52900,
        storageDays: 2, expiryLabel: 'D-5', salesVelocity: 15.8, riskStatus: 'SAFE', riskScore: 24,
        riskReason: '예약 수요가 확보되어 소비기한 이전 소진이 예상됩니다.',
        location: '경기 광주 신선센터 C-04', updatedAt: '2026.08.02 09:00',
      },
    ],
  },
  {
    id: 'WL-P-001',
    productCode: 'WL-VITA-101',
    name: '데일리 멀티비타민 밸런스',
    affiliate: '현대웰니스',
    category: '건강기능식품/비타민',
    brand: 'H.Well',
    channel: '현대웰니스몰 · Hmall',
    description: '섭취 기간과 포장 단위에 따라 SKU를 나누며, 로트별 소비기한을 재고 판단에 반영합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '멀티비타민과 건강 보조제 제품',
    updatedAt: '2026.08.02 08:45',
    skus: [
      {
        id: 'WL-SKU-001', code: 'WL-VITA-30', optionLabel: '30정 · 1개월분',
        options: { 용량: '30정', 섭취기간: '1개월', 포장: '단품' },
        stock: 620, availableStock: 590, reservedStock: 30, unit: '병', sellingPrice: 28900,
        storageDays: 96, expiryLabel: 'D-210', salesVelocity: 11.4, riskStatus: 'CAUTION', riskScore: 48,
        riskReason: '소비기한은 충분하지만 최근 신규 구매 전환율이 하락했습니다.',
        location: '이천 상온센터 W-21', updatedAt: '2026.08.02 08:45',
      },
      {
        id: 'WL-SKU-002', code: 'WL-VITA-60', optionLabel: '60정 · 2개월분',
        options: { 용량: '60정', 섭취기간: '2개월', 포장: '단품' },
        stock: 314, availableStock: 300, reservedStock: 14, unit: '병', sellingPrice: 49900,
        storageDays: 44, expiryLabel: 'D-268', salesVelocity: 16.8, riskStatus: 'SAFE', riskScore: 22,
        riskReason: '판매속도와 소비기한 모두 정상 관리 범위입니다.',
        location: '이천 상온센터 W-22', updatedAt: '2026.08.02 08:45',
      },
      {
        id: 'WL-SKU-003', code: 'WL-VITA-90G', optionLabel: '30정 × 3입 · 선물형',
        options: { 용량: '90정', 섭취기간: '3개월', 포장: '선물박스' },
        stock: 410, availableStock: 398, reservedStock: 12, unit: '세트', sellingPrice: 74900,
        storageDays: 141, expiryLabel: 'D-165', salesVelocity: 4.1, riskStatus: 'WARNING', riskScore: 76,
        riskReason: '명절 시즌 종료 후 판매속도가 47% 감소해 장기재고 전환 위험이 높습니다.',
        location: '이천 상온센터 W-23', updatedAt: '2026.08.02 08:45',
      },
    ],
  },
  {
    id: 'WL-P-002',
    productCode: 'WL-PRO-208',
    name: '프로틴 밸런스 데일리 파우더',
    affiliate: '현대웰니스',
    category: '영양보충/프로틴',
    brand: 'H.Well Active',
    channel: '현대웰니스몰 · 정기구독',
    description: '맛과 용량, 구독 구성을 SKU로 구분해 재고와 반복 구매 수요를 관리합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '운동과 영양 관리를 위한 프로틴 보충 제품',
    updatedAt: '2026.08.02 08:45',
    skus: [
      {
        id: 'WL-SKU-004', code: 'WL-PRO-VAN-500', optionLabel: '바닐라 · 500g',
        options: { 맛: '바닐라', 용량: '500g', 포장: '파우치' },
        stock: 228, availableStock: 204, reservedStock: 24, unit: '팩', sellingPrice: 39900,
        storageDays: 72, expiryLabel: 'D-184', salesVelocity: 9.4, riskStatus: 'SAFE', riskScore: 31,
        riskReason: '정기구독 수요를 포함하면 정상 소진이 예상됩니다.',
        location: '이천 상온센터 P-08', updatedAt: '2026.08.02 08:45',
      },
      {
        id: 'WL-SKU-005', code: 'WL-PRO-CHO-500', optionLabel: '초코 · 500g',
        options: { 맛: '초코', 용량: '500g', 포장: '파우치' },
        stock: 466, availableStock: 452, reservedStock: 14, unit: '팩', sellingPrice: 39900,
        storageDays: 118, expiryLabel: 'D-126', salesVelocity: 5.3, riskStatus: 'WARNING', riskScore: 70,
        riskReason: '동일 용량 바닐라 SKU 대비 재고회전율이 43% 낮습니다.',
        location: '이천 상온센터 P-09', updatedAt: '2026.08.02 08:45',
      },
      {
        id: 'WL-SKU-006', code: 'WL-PRO-MIX-30', optionLabel: '혼합 · 30포',
        options: { 맛: '바닐라/초코', 용량: '30포', 포장: '스틱형' },
        stock: 172, availableStock: 141, reservedStock: 31, unit: '박스', sellingPrice: 45900,
        storageDays: 38, expiryLabel: 'D-240', salesVelocity: 13.7, riskStatus: 'SAFE', riskScore: 20,
        riskReason: '휴대형 상품 수요와 예약재고가 안정적으로 확보되어 있습니다.',
        location: '이천 상온센터 P-10', updatedAt: '2026.08.02 08:45',
      },
    ],
  },
  {
    id: 'LV-P-001',
    productCode: 'LV-SOFA-330',
    name: '뉴트 모던 패브릭 소파',
    affiliate: '현대리바트',
    category: '거실가구/소파',
    brand: '리바트',
    channel: '리바트몰 · 오프라인 전시장',
    description: '색상과 좌석 수, 소재 조합별 SKU 단위로 완제품 재고와 배송 가능 수량을 관리합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1697978900478-8efb4386e91f?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '미니멀한 공간에 놓인 모던 패브릭 소파',
    updatedAt: '2026.08.02 07:30',
    skus: [
      {
        id: 'LV-SKU-001', code: 'LV-NEW-BE-3', optionLabel: '베이지 · 3인용',
        options: { 색상: '베이지', 크기: '3인용', 소재: '패브릭' },
        stock: 42, availableStock: 34, reservedStock: 8, unit: '조', sellingPrice: 1290000,
        storageDays: 82, expiryLabel: '시즌 D-61', salesVelocity: 1.8, riskStatus: 'SAFE', riskScore: 34,
        riskReason: '전시장 예약과 온라인 판매속도 기준 정상 관리 범위입니다.',
        location: '용인 가구센터 L-A12', updatedAt: '2026.08.02 07:30',
      },
      {
        id: 'LV-SKU-002', code: 'LV-NEW-GR-3', optionLabel: '그레이 · 3인용',
        options: { 색상: '그레이', 크기: '3인용', 소재: '패브릭' },
        stock: 76, availableStock: 70, reservedStock: 6, unit: '조', sellingPrice: 1290000,
        storageDays: 154, expiryLabel: '시즌 D-61', salesVelocity: 0.7, riskStatus: 'WARNING', riskScore: 79,
        riskReason: '베이지 SKU 대비 판매속도가 낮고 대형 보관비가 누적되고 있습니다.',
        location: '용인 가구센터 L-A13', updatedAt: '2026.08.02 07:30',
      },
      {
        id: 'LV-SKU-003', code: 'LV-NEW-BE-4', optionLabel: '베이지 · 4인용',
        options: { 색상: '베이지', 크기: '4인용', 소재: '패브릭' },
        stock: 19, availableStock: 15, reservedStock: 4, unit: '조', sellingPrice: 1590000,
        storageDays: 112, expiryLabel: '시즌 D-61', salesVelocity: 0.5, riskStatus: 'CAUTION', riskScore: 57,
        riskReason: '소진 기간이 38일로 예상되어 주간 모니터링이 필요합니다.',
        location: '용인 가구센터 L-A14', updatedAt: '2026.08.02 07:30',
      },
    ],
  },
  {
    id: 'LV-P-002',
    productCode: 'LV-TABLE-041',
    name: '로넌 세라믹 4인 식탁 세트',
    affiliate: '현대리바트',
    category: '주방가구/식탁',
    brand: '리바트',
    channel: '리바트몰 · 리바트 집테리어',
    description: '상판 색상과 의자 구성에 따라 SKU를 구분하고 부피·배송비·센터 점유율을 함께 관리합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1672678437993-8e14a6ccd38e?auto=format&fit=crop&w=1400&q=85',
    imageAlt: '따뜻한 원목 소재의 미니멀 다이닝 테이블',
    updatedAt: '2026.08.02 07:30',
    skus: [
      {
        id: 'LV-SKU-004', code: 'LV-RON-WH-4', optionLabel: '화이트 상판 · 의자 4개',
        options: { 상판: '화이트 세라믹', 구성: '의자 4개', 폭: '1400mm' },
        stock: 31, availableStock: 27, reservedStock: 4, unit: '세트', sellingPrice: 1140000,
        storageDays: 73, expiryLabel: '시즌 D-92', salesVelocity: 1.2, riskStatus: 'SAFE', riskScore: 29,
        riskReason: '전월 대비 판매속도가 안정적이며 예약 주문이 유지되고 있습니다.',
        location: '용인 가구센터 L-B03', updatedAt: '2026.08.02 07:30',
      },
      {
        id: 'LV-SKU-005', code: 'LV-RON-GR-4', optionLabel: '그레이 상판 · 의자 4개',
        options: { 상판: '그레이 세라믹', 구성: '의자 4개', 폭: '1400mm' },
        stock: 54, availableStock: 52, reservedStock: 2, unit: '세트', sellingPrice: 1140000,
        storageDays: 186, expiryLabel: '시즌 D-92', salesVelocity: 0.4, riskStatus: 'CRITICAL', riskScore: 91,
        riskReason: '장기 보관 180일을 초과했고 센터 점유비용이 높은 대형 SKU입니다.',
        location: '용인 가구센터 L-B04', updatedAt: '2026.08.02 07:30',
      },
      {
        id: 'LV-SKU-006', code: 'LV-RON-WH-B', optionLabel: '화이트 상판 · 벤치 구성',
        options: { 상판: '화이트 세라믹', 구성: '의자 2개+벤치', 폭: '1400mm' },
        stock: 24, availableStock: 21, reservedStock: 3, unit: '세트', sellingPrice: 1210000,
        storageDays: 105, expiryLabel: '시즌 D-92', salesVelocity: 0.8, riskStatus: 'CAUTION', riskScore: 55,
        riskReason: '벤치 구성의 판매속도가 기준 이하로 하락해 구성별 관찰이 필요합니다.',
        location: '용인 가구센터 L-B05', updatedAt: '2026.08.02 07:30',
      },
    ],
  },
];

const SKU_IMAGE_URLS: Record<string, string> = {
  'GF-SKU-001': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  'GF-SKU-002': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
  'GF-SKU-003': 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1200&q=85',
  'GF-SKU-004': 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=1200&q=85',
  'GF-SKU-005': 'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&w=1200&q=85',
  'GF-SKU-006': 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-001': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-002': 'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-003': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-004': 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-005': 'https://images.unsplash.com/photo-1579722821273-0f6c1ddde163?auto=format&fit=crop&w=1200&q=85',
  'WL-SKU-006': 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-001': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-002': 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-003': 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-004': 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-005': 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=1200&q=85',
  'LV-SKU-006': 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=1200&q=85',
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .replace(/\. /g, '.').replace(/\.$/, '');
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export const SKU_OPERATION_DATA: Record<string, SkuOperationData> = Object.fromEntries(
  INVENTORY_PRODUCTS.flatMap((product) => product.skus.map((sku) => {
    const firstQuantity = Math.ceil(sku.stock * 0.42);
    const secondQuantity = sku.stock - firstQuantity;
    const firstReserved = Math.min(sku.reservedStock, Math.floor(sku.reservedStock * 0.4));
    const secondReserved = sku.reservedStock - firstReserved;
    const expiryDays = Number(sku.expiryLabel.match(/\d+/)?.[0] ?? 90);
    const isFurniture = product.affiliate === '현대리바트';
    const isWellness = product.affiliate === '현대웰니스';
    const policy = isWellness
      ? { nearExpiryDays: 90, saleStopDays: 30 }
      : { nearExpiryDays: 3, saleStopDays: 1 };
    const referenceDate = new Date(2026, 7, 2);
    const firstExpiry = new Date(2026, 7, 2 + Math.max(1, expiryDays - 2));
    const secondExpiry = new Date(2026, 7, 2 + expiryDays + 5);
    const firstSaleStop = subtractDays(firstExpiry, policy.saleStopDays);
    const secondSaleStop = subtractDays(secondExpiry, policy.saleStopDays);
    const locationPrefix = sku.location.split(' ').slice(0, -1).join(' ');
    const lots: InventoryLot[] = [
      {
        id: isFurniture ? `IN-${sku.code}-A` : `LOT-${sku.code}-01`,
        receivedAt: isFurniture ? '2026.05.18' : '2026.07.29',
        expiryDate: isFurniture ? undefined : formatDate(firstExpiry),
        expiryLabel: isFurniture ? '선입고 재고' : `D-${Math.max(1, expiryDays - 2)}`,
        nearExpiryStartDate: isFurniture ? undefined : formatDate(subtractDays(firstExpiry, policy.nearExpiryDays)),
        saleStopDate: isFurniture ? undefined : formatDate(firstSaleStop),
        expectedRemainingAtSaleStop: isFurniture ? undefined : Math.max(0, firstQuantity - firstReserved - Math.ceil(daysBetween(referenceDate, firstSaleStop) * sku.salesVelocity)),
        traceabilityCode: isWellness ? `HT-${sku.code}-01` : undefined,
        manufacturer: isWellness ? 'H.Well 제조 파트너' : undefined,
        recallStatus: isWellness ? 'CLEAR' : undefined,
        quantity: firstQuantity,
        availableQuantity: firstQuantity - firstReserved,
        reservedQuantity: firstReserved,
        location: sku.location,
        status: sku.riskStatus === 'CRITICAL' || sku.riskStatus === 'WARNING' ? 'PRIORITY' : 'NORMAL',
        note: isFurniture ? '센터 선입고분 · 우선 배정' : '소비기한이 가까운 선입고 LOT',
      },
      {
        id: isFurniture ? `IN-${sku.code}-B` : `LOT-${sku.code}-02`,
        receivedAt: isFurniture ? '2026.07.11' : '2026.08.01',
        expiryDate: isFurniture ? undefined : formatDate(secondExpiry),
        expiryLabel: isFurniture ? '최근 입고 재고' : `D-${expiryDays + 5}`,
        nearExpiryStartDate: isFurniture ? undefined : formatDate(subtractDays(secondExpiry, policy.nearExpiryDays)),
        saleStopDate: isFurniture ? undefined : formatDate(secondSaleStop),
        expectedRemainingAtSaleStop: isFurniture ? undefined : Math.max(0, secondQuantity - secondReserved - Math.ceil(daysBetween(referenceDate, secondSaleStop) * sku.salesVelocity)),
        traceabilityCode: isWellness ? `HT-${sku.code}-02` : undefined,
        manufacturer: isWellness ? 'H.Well 제조 파트너' : undefined,
        recallStatus: isWellness ? 'CLEAR' : undefined,
        quantity: secondQuantity,
        availableQuantity: secondQuantity - secondReserved,
        reservedQuantity: secondReserved,
        location: `${locationPrefix} ${sku.location.split(' ').at(-1)}-2`,
        status: 'NORMAL',
        note: isFurniture ? '최근 입고분 · 일반 배정' : '최근 입고된 정상 출고 LOT',
      },
    ];

    return [sku.id, {
      imageUrl: SKU_IMAGE_URLS[sku.id] ?? product.imageUrl,
      imageAlt: `${product.name} ${sku.optionLabel} 옵션 이미지`,
      lots,
    }];
  }))
);

export const INVENTORY_STRATEGY_OUTCOMES: Record<string, InventoryStrategyOutcome> = {
  'STR-2026-071': {
    strategyId: 'STR-2026-071', beforeStock: 374, afterStock: 210, targetSellThrough: 56, actualSellThrough: 44,
    resultLabel: '목표 대비 78%', resultSummary: '판매량은 증가했지만 무료배송 구간의 전환이 예상보다 낮아 타임딜 노출 연장이 필요합니다.',
    timeline: [
      { date: '07.24', label: '전략 승인', state: 'DONE' },
      { date: '07.25', label: '타임딜 시작', state: 'DONE' },
      { date: '08.02', label: '성과 점검', state: 'CURRENT' },
      { date: '08.05', label: '종료 예정', state: 'UPCOMING' },
    ],
  },
  'STR-2026-065': {
    strategyId: 'STR-2026-065', beforeStock: 312, afterStock: 136, targetSellThrough: 60, actualSellThrough: 56,
    resultLabel: '목표 대비 94%', resultSummary: '교차 구성 선택률이 높았고, 단일 할인보다 마진을 지키면서 신선재고를 고르게 소진했습니다.',
    timeline: [
      { date: '07.18', label: '전략 승인', state: 'DONE' },
      { date: '07.19', label: '프로모션 시작', state: 'DONE' },
      { date: '07.25', label: '중간 최적화', state: 'DONE' },
      { date: '07.31', label: '실행 완료', state: 'DONE' },
    ],
  },
  'STR-2026-059': {
    strategyId: 'STR-2026-059', beforeStock: 410, targetSellThrough: 35,
    resultLabel: '실행 대기', resultSummary: 'VIP 채널의 노출 슬롯 승인이 완료되면 3입 선물형 SKU부터 순차 적용합니다.',
    timeline: [
      { date: '07.12', label: '전략 생성', state: 'DONE' },
      { date: '07.14', label: '마진 검토', state: 'DONE' },
      { date: '08.02', label: '채널 승인', state: 'CURRENT' },
      { date: '08.08', label: '실행 예정', state: 'UPCOMING' },
    ],
  },
  'STR-2026-048': {
    strategyId: 'STR-2026-048', beforeStock: 684, afterStock: 466, targetSellThrough: 34, actualSellThrough: 32,
    resultLabel: '목표 대비 95%', resultSummary: '첫 달 구독 전환율이 개선되어 단품 재고를 안정적으로 소진했고 재구매 기반도 확보했습니다.',
    timeline: [
      { date: '06.29', label: '전략 승인', state: 'DONE' },
      { date: '07.01', label: '구독 전환 시작', state: 'DONE' },
      { date: '07.15', label: '혜택 조정', state: 'DONE' },
      { date: '07.29', label: '실행 완료', state: 'DONE' },
    ],
  },
  'STR-2026-041': {
    strategyId: 'STR-2026-041', beforeStock: 105, afterStock: 76, targetSellThrough: 39, actualSellThrough: 28,
    resultLabel: '목표 대비 71%', resultSummary: '전시장 체험 전환은 양호했으나 대형가구 배송일 제약으로 실제 주문 확정이 지연되고 있습니다.',
    timeline: [
      { date: '06.20', label: '전략 승인', state: 'DONE' },
      { date: '06.24', label: '전시장 연계', state: 'DONE' },
      { date: '07.20', label: '배송권역 확대', state: 'DONE' },
      { date: '08.02', label: '성과 점검', state: 'CURRENT' },
    ],
  },
  'STR-2026-033': {
    strategyId: 'STR-2026-033', beforeStock: 54, targetSellThrough: 59,
    resultLabel: '실행 대기', resultSummary: '집테리어 패키지 판매가 확정되면 장기재고부터 배정하도록 물류 우선순위를 설정했습니다.',
    timeline: [
      { date: '06.08', label: '전략 생성', state: 'DONE' },
      { date: '06.12', label: '공간비용 검토', state: 'DONE' },
      { date: '08.02', label: '패키지 승인', state: 'CURRENT' },
      { date: '08.10', label: '실행 예정', state: 'UPCOMING' },
    ],
  },
};

export const INVENTORY_STRATEGY_HISTORY: InventoryStrategyHistory[] = [
  {
    id: 'STR-2026-071',
    productId: 'GF-P-001',
    skuIds: ['GF-SKU-001'],
    title: '소비기한 임박 6팩 집중 소진 전략',
    createdAt: '2026.07.24 10:30',
    status: 'EXECUTING',
    strategyType: '빠른 소진',
    discountRate: 18,
    channel: '그리팅몰 타임딜',
    predictedSales: 210,
    actualSales: 164,
    expectedProfit: 6840000,
    actualProfit: 5120000,
    summary: 'D-5 냉장 SKU에 한해 할인과 무료배송을 결합한 한정 프로모션입니다.',
  },
  {
    id: 'STR-2026-065',
    productId: 'GF-P-002',
    skuIds: ['GF-SKU-004', 'GF-SKU-005'],
    title: '위클리 샐러드 교차 구성 프로모션',
    createdAt: '2026.07.18 09:10',
    status: 'FINISHED',
    strategyType: '묶음 판매',
    discountRate: 15,
    channel: '그리팅몰 · Hmall',
    predictedSales: 188,
    actualSales: 176,
    expectedProfit: 5290000,
    actualProfit: 5010000,
    summary: '그린믹스와 닭가슴살 SKU를 교차 선택하도록 구성해 신선재고를 분산 소진했습니다.',
  },
  {
    id: 'STR-2026-059',
    productId: 'WL-P-001',
    skuIds: ['WL-SKU-003'],
    title: '선물형 멀티비타민 장기재고 방어',
    createdAt: '2026.07.12 14:20',
    status: 'APPROVED',
    strategyType: '마진 방어',
    discountRate: 12,
    channel: '현대웰니스몰 VIP 큐레이션',
    predictedSales: 142,
    expectedProfit: 8120000,
    summary: '선물형 SKU의 할인폭을 제한하고 VIP 채널 노출을 확대하는 전략입니다.',
  },
  {
    id: 'STR-2026-048',
    productId: 'WL-P-002',
    skuIds: ['WL-SKU-005'],
    title: '초코 프로틴 정기구독 전환 캠페인',
    createdAt: '2026.06.29 11:40',
    status: 'FINISHED',
    strategyType: '채널 전환',
    discountRate: 10,
    channel: '정기구독 신규 전환',
    predictedSales: 230,
    actualSales: 218,
    expectedProfit: 7350000,
    actualProfit: 7010000,
    summary: '단품 재고를 정기구독 첫 달 구성으로 전환해 판매속도를 회복했습니다.',
  },
  {
    id: 'STR-2026-041',
    productId: 'LV-P-001',
    skuIds: ['LV-SKU-002'],
    title: '그레이 3인용 전시장 연계 소진',
    createdAt: '2026.06.20 15:00',
    status: 'EXECUTING',
    strategyType: '옴니채널',
    discountRate: 15,
    channel: '리바트몰 · 강남 전시장',
    predictedSales: 41,
    actualSales: 29,
    expectedProfit: 12800000,
    actualProfit: 8600000,
    summary: '온라인 재고와 전시장 진열상품을 함께 노출하고 배송비를 지원하는 전략입니다.',
  },
  {
    id: 'STR-2026-033',
    productId: 'LV-P-002',
    skuIds: ['LV-SKU-005'],
    title: '그레이 세라믹 식탁 긴급 공간 회수',
    createdAt: '2026.06.08 13:30',
    status: 'APPROVED',
    strategyType: '빠른 소진',
    discountRate: 22,
    channel: '리바트 집테리어 패키지',
    predictedSales: 32,
    expectedProfit: 11800000,
    summary: '센터 점유율이 높은 장기재고 SKU를 주방 리모델링 패키지에 우선 편성합니다.',
  },
];

export const BUNDLE_RECOMMENDATIONS: BundleRecommendation[] = [
  { productId: 'GF-P-001', reason: '건강관리 목적이 유사하고 정기배송 전환 가능성이 높습니다.', fitScore: 92 },
  { productId: 'GF-P-002', reason: '신선식품을 함께 제안해 웰니스 식단 패키지로 확장할 수 있습니다.', fitScore: 88 },
  { productId: 'WL-P-001', reason: '균형식과 비타민의 섭취 주기가 비슷해 건강 루틴 구성이 가능합니다.', fitScore: 90 },
  { productId: 'WL-P-002', reason: '홈트레이닝·건강식 테마의 교차 판매에 적합합니다.', fitScore: 86 },
  { productId: 'LV-P-001', reason: '리빙 공간과 건강 루틴을 연결한 라이프스타일 패키지 후보입니다.', fitScore: 78 },
  { productId: 'LV-P-002', reason: '식탁과 식품을 묶은 홈다이닝 패키지로 연결하기 좋습니다.', fitScore: 94 },
];

export const ALL_AFFILIATES: InventoryAffiliate[] = ['현대그린푸드', '현대웰니스', '현대리바트'];
