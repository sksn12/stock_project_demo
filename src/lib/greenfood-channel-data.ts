import { getEffectiveSkuRiskStatus, InventorySku, SkuRiskStatus } from './inventory-control-data';

export type SalesChannelType = 'ONLINE' | 'OFFLINE' | 'CENTER';
export type InventoryLocationType = 'CENTER' | 'STORE';
export type InventoryHealth = 'SURPLUS' | 'BALANCED' | 'SHORTAGE';
export type TransferMode = 'REALLOCATION' | 'RT';

export interface ChannelInventory {
  id: string;
  skuId: string;
  channelName: string;
  channelType: SalesChannelType;
  region: string;
  fulfillmentCenter: string;
  stock: number;
  availableStock: number;
  outboundScheduled: number;
  dailySales: number;
  forecast14Days: number;
  safetyStock: number;
  health: InventoryHealth;
  lastSyncedAt: string;
}

export interface TransferRecommendation {
  skuId: string;
  mode: TransferMode;
  sourceId: string;
  destinationId: string;
  quantity: number;
  leadTimeHours: number;
  estimatedCost: number;
  expectedSales14Days: number;
  avoidedWasteQuantity: number;
  reason: string;
}

export const CHANNEL_TYPE_META: Record<SalesChannelType, {
  label: string;
  description: string;
  className: string;
}> = {
  ONLINE: {
    label: '온라인',
    description: '그리팅몰·외부 온라인몰',
    className: 'border-sky-300 bg-sky-50 text-sky-800',
  },
  OFFLINE: {
    label: '오프라인',
    description: '현대백화점 식품관',
    className: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  CENTER: {
    label: '공용재고',
    description: '판매 채널에 아직 할당되지 않은 물류센터 재고',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
};

export const INVENTORY_LOCATION_META: Record<InventoryLocationType, {
  label: string;
  description: string;
  className: string;
}> = {
  CENTER: {
    label: '물류센터',
    description: '온라인 할당재고와 공용재고를 보관하는 출고 거점',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  STORE: {
    label: '매장',
    description: '오프라인 판매처가 직접 보유한 운영재고',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
};

export const INVENTORY_HEALTH_META: Record<InventoryHealth, {
  label: string;
  className: string;
}> = {
  SURPLUS: { label: '과잉', className: 'border-rose-300 bg-rose-50 text-rose-800' },
  BALANCED: { label: '적정', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  SHORTAGE: { label: '부족 예상', className: 'border-amber-300 bg-amber-50 text-amber-900' },
};

const LAST_SYNC = '2026.08.06 05:00';

export const GREENFOOD_CHANNEL_INVENTORY: ChannelInventory[] = [
  { id: 'GRT-BEEF', skuId: 'GF-SKU-001', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 132, availableStock: 121, outboundScheduled: 11, dailySales: 2.4, forecast14Days: 34, safetyStock: 35, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-BEEF', skuId: 'GF-SKU-001', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 42, availableStock: 36, outboundScheduled: 6, dailySales: 8.2, forecast14Days: 115, safetyStock: 40, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-BEEF', skuId: 'GF-SKU-001', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 64, availableStock: 58, outboundScheduled: 6, dailySales: 5.1, forecast14Days: 71, safetyStock: 32, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-BEEF', skuId: 'GF-SKU-001', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 46, availableStock: 35, outboundScheduled: 11, dailySales: 0, forecast14Days: 0, safetyStock: 20, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-CHK', skuId: 'GF-SKU-002', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 36, availableStock: 33, outboundScheduled: 3, dailySales: 3.9, forecast14Days: 55, safetyStock: 25, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-CHK', skuId: 'GF-SKU-002', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 40, availableStock: 38, outboundScheduled: 2, dailySales: 1.5, forecast14Days: 21, safetyStock: 18, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-CHK', skuId: 'GF-SKU-002', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 30, availableStock: 28, outboundScheduled: 2, dailySales: 1.1, forecast14Days: 15, safetyStock: 15, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-CHK', skuId: 'GF-SKU-002', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 20, availableStock: 19, outboundScheduled: 1, dailySales: 0, forecast14Days: 0, safetyStock: 12, health: 'BALANCED', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-TOFU', skuId: 'GF-SKU-003', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 205, availableStock: 190, outboundScheduled: 15, dailySales: 2.1, forecast14Days: 29, safetyStock: 40, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-TOFU', skuId: 'GF-SKU-003', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 72, availableStock: 68, outboundScheduled: 4, dailySales: 5.6, forecast14Days: 78, safetyStock: 35, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-TOFU', skuId: 'GF-SKU-003', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 105, availableStock: 98, outboundScheduled: 7, dailySales: 3.8, forecast14Days: 53, safetyStock: 30, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-TOFU', skuId: 'GF-SKU-003', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 80, availableStock: 79, outboundScheduled: 1, dailySales: 0, forecast14Days: 0, safetyStock: 25, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SOUP-MSH', skuId: 'GF-SKU-004', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 52, availableStock: 48, outboundScheduled: 4, dailySales: 1.2, forecast14Days: 17, safetyStock: 18, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SOUP-MSH', skuId: 'GF-SKU-004', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 24, availableStock: 21, outboundScheduled: 3, dailySales: 3.4, forecast14Days: 48, safetyStock: 22, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'DAEGU-SOUP-MSH', skuId: 'GF-SKU-004', channelName: '더현대 대구 식품관', channelType: 'OFFLINE', region: '대구', fulfillmentCenter: '대구 냉동센터', stock: 28, availableStock: 26, outboundScheduled: 2, dailySales: 1.1, forecast14Days: 15, safetyStock: 15, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SOUP-MSH', skuId: 'GF-SKU-004', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 18, availableStock: 15, outboundScheduled: 3, dailySales: 0, forecast14Days: 0, safetyStock: 12, health: 'BALANCED', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SOUP-CHK', skuId: 'GF-SKU-005', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 24, availableStock: 22, outboundScheduled: 2, dailySales: 2.7, forecast14Days: 38, safetyStock: 18, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SOUP-CHK', skuId: 'GF-SKU-005', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 30, availableStock: 28, outboundScheduled: 2, dailySales: 1.2, forecast14Days: 17, safetyStock: 14, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'DAEGU-SOUP-CHK', skuId: 'GF-SKU-005', channelName: '더현대 대구 식품관', channelType: 'OFFLINE', region: '대구', fulfillmentCenter: '대구 냉동센터', stock: 30, availableStock: 27, outboundScheduled: 3, dailySales: 0.8, forecast14Days: 11, safetyStock: 12, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SOUP-CHK', skuId: 'GF-SKU-005', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 12, availableStock: 11, outboundScheduled: 1, dailySales: 0, forecast14Days: 0, safetyStock: 8, health: 'BALANCED', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SOUP-BEEF', skuId: 'GF-SKU-006', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 62, availableStock: 58, outboundScheduled: 4, dailySales: 1.4, forecast14Days: 20, safetyStock: 20, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SOUP-BEEF', skuId: 'GF-SKU-006', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 28, availableStock: 25, outboundScheduled: 3, dailySales: 2.9, forecast14Days: 41, safetyStock: 20, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-SOUP-BEEF', skuId: 'GF-SKU-006', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 36, availableStock: 33, outboundScheduled: 3, dailySales: 1.8, forecast14Days: 25, safetyStock: 16, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SOUP-BEEF', skuId: 'GF-SKU-006', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 22, availableStock: 16, outboundScheduled: 6, dailySales: 0, forecast14Days: 0, safetyStock: 12, health: 'BALANCED', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SALAD', skuId: 'GF-SKU-007', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 155, availableStock: 145, outboundScheduled: 10, dailySales: 1.8, forecast14Days: 25, safetyStock: 30, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SALAD', skuId: 'GF-SKU-007', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 48, availableStock: 44, outboundScheduled: 4, dailySales: 4.6, forecast14Days: 64, safetyStock: 28, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-SALAD', skuId: 'GF-SKU-007', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 74, availableStock: 68, outboundScheduled: 6, dailySales: 2.7, forecast14Days: 38, safetyStock: 25, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SALAD', skuId: 'GF-SKU-007', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 55, availableStock: 30, outboundScheduled: 25, dailySales: 0, forecast14Days: 0, safetyStock: 20, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SALAD-CHICKEN', skuId: 'GF-SKU-008', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 118, availableStock: 108, outboundScheduled: 10, dailySales: 3.1, forecast14Days: 43, safetyStock: 28, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SALAD-CHICKEN', skuId: 'GF-SKU-008', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 42, availableStock: 39, outboundScheduled: 3, dailySales: 3.8, forecast14Days: 53, safetyStock: 25, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'SEOUL-SALAD-CHICKEN', skuId: 'GF-SKU-008', channelName: '더현대 서울 식품관', channelType: 'OFFLINE', region: '서울', fulfillmentCenter: '경기 광주 냉동센터', stock: 66, availableStock: 61, outboundScheduled: 5, dailySales: 2.2, forecast14Days: 31, safetyStock: 22, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SALAD-CHICKEN', skuId: 'GF-SKU-008', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 30, availableStock: 24, outboundScheduled: 6, dailySales: 0, forecast14Days: 0, safetyStock: 15, health: 'BALANCED', lastSyncedAt: LAST_SYNC },

  { id: 'GRT-SALAD-PASTA', skuId: 'GF-SKU-009', channelName: '그리팅몰', channelType: 'ONLINE', region: '전국', fulfillmentCenter: '경기 광주 냉동센터', stock: 120, availableStock: 108, outboundScheduled: 12, dailySales: 1.5, forecast14Days: 21, safetyStock: 25, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'PANGYO-SALAD-PASTA', skuId: 'GF-SKU-009', channelName: '현대백화점 판교점 식품관', channelType: 'OFFLINE', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 38, availableStock: 35, outboundScheduled: 3, dailySales: 3.2, forecast14Days: 45, safetyStock: 22, health: 'SHORTAGE', lastSyncedAt: LAST_SYNC },
  { id: 'DAEGU-SALAD-PASTA', skuId: 'GF-SKU-009', channelName: '더현대 대구 식품관', channelType: 'OFFLINE', region: '대구', fulfillmentCenter: '대구 냉동센터', stock: 46, availableStock: 42, outboundScheduled: 4, dailySales: 1.3, forecast14Days: 18, safetyStock: 16, health: 'SURPLUS', lastSyncedAt: LAST_SYNC },
  { id: 'CENTER-SALAD-PASTA', skuId: 'GF-SKU-009', channelName: '경기 광주 냉동센터', channelType: 'CENTER', region: '경기', fulfillmentCenter: '경기 광주 냉동센터', stock: 28, availableStock: 23, outboundScheduled: 5, dailySales: 0, forecast14Days: 0, safetyStock: 15, health: 'BALANCED', lastSyncedAt: LAST_SYNC },
];

export const GREENFOOD_TRANSFER_RECOMMENDATIONS: TransferRecommendation[] = [
  { skuId: 'GF-SKU-001', mode: 'REALLOCATION', sourceId: 'GRT-BEEF', destinationId: 'PANGYO-BEEF', quantity: 50, leadTimeHours: 2, estimatedCost: 32000, expectedSales14Days: 50, avoidedWasteQuantity: 38, reason: '같은 경기 광주 냉동센터 재고이므로 물리적 이동 없이 온라인 할당량을 판교점으로 전환할 수 있습니다.' },
  { skuId: 'GF-SKU-003', mode: 'REALLOCATION', sourceId: 'GRT-TOFU', destinationId: 'PANGYO-TOFU', quantity: 45, leadTimeHours: 2, estimatedCost: 28000, expectedSales14Days: 45, avoidedWasteQuantity: 34, reason: '그리팅몰 재고는 90일 이상 보유가 예상되지만 판교점은 14일 내 부족이 예상됩니다.' },
  { skuId: 'GF-SKU-004', mode: 'REALLOCATION', sourceId: 'GRT-SOUP-MSH', destinationId: 'PANGYO-SOUP-MSH', quantity: 20, leadTimeHours: 2, estimatedCost: 18000, expectedSales14Days: 20, avoidedWasteQuantity: 12, reason: '동일 센터의 온라인 할당재고를 판교점으로 재배정하면 추가 생산 없이 품절 위험을 줄일 수 있습니다.' },
  { skuId: 'GF-SKU-005', mode: 'RT', sourceId: 'DAEGU-SOUP-CHK', destinationId: 'GRT-SOUP-CHK', quantity: 12, leadTimeHours: 18, estimatedCost: 76000, expectedSales14Days: 12, avoidedWasteQuantity: 8, reason: '대구점의 판매속도는 낮고 그리팅몰은 9일 내 부족이 예상되어 센터 간 물리적 이동이 유리합니다.' },
  { skuId: 'GF-SKU-006', mode: 'REALLOCATION', sourceId: 'GRT-SOUP-BEEF', destinationId: 'PANGYO-SOUP-BEEF', quantity: 18, leadTimeHours: 2, estimatedCost: 16000, expectedSales14Days: 18, avoidedWasteQuantity: 10, reason: '판교점의 판매속도가 그리팅몰보다 두 배 이상 높고 같은 센터 재고를 사용합니다.' },
  { skuId: 'GF-SKU-007', mode: 'REALLOCATION', sourceId: 'GRT-SALAD', destinationId: 'PANGYO-SALAD', quantity: 32, leadTimeHours: 2, estimatedCost: 22000, expectedSales14Days: 32, avoidedWasteQuantity: 24, reason: '그리팅몰의 과잉 할당재고를 판교점으로 전환하면 정상가 판매 가능성이 높습니다.' },
  { skuId: 'GF-SKU-008', mode: 'REALLOCATION', sourceId: 'GRT-SALAD-CHICKEN', destinationId: 'PANGYO-SALAD-CHICKEN', quantity: 24, leadTimeHours: 2, estimatedCost: 19000, expectedSales14Days: 24, avoidedWasteQuantity: 16, reason: '같은 센터 내 채널 재배정만으로 판교점의 14일 예상 부족분을 보충할 수 있습니다.' },
  { skuId: 'GF-SKU-009', mode: 'RT', sourceId: 'DAEGU-SALAD-PASTA', destinationId: 'PANGYO-SALAD-PASTA', quantity: 18, leadTimeHours: 20, estimatedCost: 84000, expectedSales14Days: 18, avoidedWasteQuantity: 11, reason: '대구점의 잉여재고를 판매속도가 빠른 판교점으로 이동하면 추가 생산을 줄일 수 있습니다.' },
];

export function getChannelInventoryBySku(skuId: string) {
  return GREENFOOD_CHANNEL_INVENTORY.filter((item) => item.skuId === skuId);
}

export function getTransferRecommendation(skuId: string) {
  return GREENFOOD_TRANSFER_RECOMMENDATIONS.find((item) => item.skuId === skuId);
}

export function getChannelInventoryItem(id: string) {
  return GREENFOOD_CHANNEL_INVENTORY.find((item) => item.id === id);
}

export function getInventoryLocationType(item: ChannelInventory): InventoryLocationType {
  return item.channelType === 'OFFLINE' ? 'STORE' : 'CENTER';
}

export function getInventoryLocationName(item: ChannelInventory) {
  return item.channelType === 'OFFLINE' ? item.channelName : item.fulfillmentCenter;
}

export function getInventoryAllocationLabel(item: ChannelInventory) {
  if (item.channelType === 'ONLINE') return `${item.channelName} 할당`;
  if (item.channelType === 'OFFLINE') return '매장 보유';
  return '공용 미할당';
}

export function getTransferableStock(item: ChannelInventory) {
  return Math.max(0, item.availableStock - item.safetyStock);
}

export function getDaysToStockout(item: ChannelInventory) {
  if (item.channelType === 'CENTER' || item.dailySales <= 0) return null;
  return Math.max(0, Math.round(item.availableStock / item.dailySales));
}

export function getChannelRiskStatus(item: ChannelInventory, sku: InventorySku): SkuRiskStatus {
  const stockCoverDays = getDaysToStockout(item) ?? 0;
  const demandBase = Math.max(1, item.forecast14Days + item.safetyStock);
  const overstockRatio = item.availableStock / demandBase;
  const expiryDays = Number(sku.expiryLabel.match(/\d+/)?.[0] ?? 365);
  const remainsAfterForecast = item.availableStock > item.forecast14Days;

  if ((expiryDays <= 30 && remainsAfterForecast) || stockCoverDays >= 90 || overstockRatio >= 2.5) return 'CRITICAL';
  if ((expiryDays <= 60 && remainsAfterForecast) || stockCoverDays >= 60 || overstockRatio >= 1.8) return 'WARNING';
  if (stockCoverDays >= 30 || overstockRatio >= 1.2) return 'CAUTION';
  return 'SAFE';
}

export function getSkuImbalanceLabel(sku: InventorySku) {
  const rows = getChannelInventoryBySku(sku.id);
  const surplus = rows.find((row) => row.health === 'SURPLUS');
  const shortage = rows.find((row) => row.health === 'SHORTAGE');
  if (surplus && shortage) return `${surplus.channelName} 과잉 · ${shortage.channelName} 부족`;
  if (shortage) return `${shortage.channelName} 부족 예상`;
  if (surplus) return `${surplus.channelName} 과잉`;
  return '판매처별 재고 적정';
}

export function getSkuChannelRisk(sku: InventorySku): SkuRiskStatus {
  const rows = getChannelInventoryBySku(sku.id);
  if (rows.some((row) => row.health === 'SURPLUS') && rows.some((row) => row.health === 'SHORTAGE')) return 'CRITICAL';
  if (rows.some((row) => row.health !== 'BALANCED')) return 'WARNING';
  return getEffectiveSkuRiskStatus(sku);
}
