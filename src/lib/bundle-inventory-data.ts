export type BundleInventoryStatus = 'DRAFT' | 'READY' | 'LOW_STOCK' | 'SOLD_OUT';

export interface BundleInventoryItem {
  skuId: string;
  channelId: string;
  skuCode: string;
  productName: string;
  optionLabel: string;
  quantityPerBundle: number;
  availableStock: number;
  unit: string;
  channelName: string;
}

export interface BundleInventoryRecord {
  bundleCode: string;
  bundleName: string;
  status: BundleInventoryStatus;
  items: BundleInventoryItem[];
  listPrice: number;
  sellingPrice: number;
  estimatedProfit: number;
  marginRate: number;
  availableBundleStock: number;
  fulfillmentCenter: string;
  createdAt: string;
}

export const BUNDLE_STATUS_META: Record<BundleInventoryStatus, { label: string; className: string }> = {
  DRAFT: { label: '초안', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  READY: { label: '판매 가능', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  LOW_STOCK: { label: '재고 부족', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  SOLD_OUT: { label: '품절', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

export const INITIAL_BUNDLE_INVENTORY: BundleInventoryRecord[] = [
  {
    bundleCode: 'BND-20260806-001',
    bundleName: '그리팅 영양균형 한 끼 세트',
    status: 'READY',
    items: [
      { skuId: 'GF-SKU-001', channelId: 'GRT-BEEF', skuCode: 'GF-LUNCH-BEEF-350', productName: '그리팅 영양균형 도시락', optionLabel: '소불고기 도시락 · 350g', quantityPerBundle: 1, availableStock: 121, unit: '개', channelName: '그리팅몰' },
      { skuId: 'GF-SKU-007', channelId: 'GRT-SALAD', skuCode: 'GF-SOUP-SEA-06', productName: '그리팅 저당 국·탕', optionLabel: '소고기 미역국 · 6팩', quantityPerBundle: 1, availableStock: 145, unit: '개', channelName: '그리팅몰' },
    ],
    listPrice: 37800,
    sellingPrice: 34900,
    estimatedProfit: 10664,
    marginRate: 30.6,
    availableBundleStock: 121,
    fulfillmentCenter: '경기 광주 냉동센터',
    createdAt: '2026.08.06 14:20',
  },
  {
    bundleCode: 'BND-20260805-003',
    bundleName: '그리팅 샐러드 든든 세트',
    status: 'LOW_STOCK',
    items: [
      { skuId: 'GF-SKU-004', channelId: 'CENTER-SOUP-MSH', skuCode: 'GF-SAL-GRN-05', productName: '그리팅 샐러드', optionLabel: '그린믹스 · 5팩', quantityPerBundle: 2, availableStock: 15, unit: '개', channelName: '경기 광주 냉동센터' },
      { skuId: 'GF-SKU-005', channelId: 'CENTER-SOUP-CHK', skuCode: 'GF-SAL-CHK-05', productName: '그리팅 샐러드', optionLabel: '닭가슴살 · 5팩', quantityPerBundle: 1, availableStock: 11, unit: '개', channelName: '경기 광주 냉동센터' },
    ],
    listPrice: 42700,
    sellingPrice: 39900,
    estimatedProfit: 8190,
    marginRate: 20.5,
    availableBundleStock: 7,
    fulfillmentCenter: '경기 광주 냉동센터',
    createdAt: '2026.08.05 11:10',
  },
  {
    bundleCode: 'BND-20260803-002',
    bundleName: '프리미엄 케어푸드 3종 세트',
    status: 'DRAFT',
    items: [
      { skuId: 'GF-SKU-002', channelId: 'GRT-CHK', skuCode: 'GF-LUNCH-CHK-350', productName: '그리팅 영양균형 도시락', optionLabel: '닭가슴살 현미 도시락 · 350g', quantityPerBundle: 1, availableStock: 33, unit: '개', channelName: '그리팅몰' },
      { skuId: 'GF-SKU-008', channelId: 'GRT-SALAD-CHICKEN', skuCode: 'GF-SOUP-CHK-06', productName: '그리팅 저당 국·탕', optionLabel: '닭곰탕 · 6팩', quantityPerBundle: 1, availableStock: 108, unit: '개', channelName: '그리팅몰' },
      { skuId: 'GF-SKU-009', channelId: 'GRT-SALAD-PASTA', skuCode: 'GF-SOUP-MSH-06', productName: '그리팅 저당 국·탕', optionLabel: '버섯 들깨탕 · 6팩', quantityPerBundle: 1, availableStock: 108, unit: '개', channelName: '그리팅몰' },
    ],
    listPrice: 57600,
    sellingPrice: 51900,
    estimatedProfit: 12120,
    marginRate: 23.4,
    availableBundleStock: 33,
    fulfillmentCenter: '경기 광주 냉동센터',
    createdAt: '2026.08.03 09:35',
  },
];
