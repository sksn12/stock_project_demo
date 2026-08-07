'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Globe2,
  History,
  ImageOff,
  Info,
  Layers3,
  MapPin,
  PackageCheck,
  Send,
  ShieldAlert,
  Sparkles,
  Store,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  INVENTORY_STRATEGY_HISTORY,
  InventoryProduct,
  InventorySku,
  RISK_META,
  SKU_OPERATION_DATA,
} from '@/lib/inventory-control-data';
import {
  CHANNEL_TYPE_META,
  INVENTORY_HEALTH_META,
  INVENTORY_LOCATION_META,
  SalesChannelType,
  getChannelInventoryBySku,
  getDaysToStockout,
  getInventoryAllocationLabel,
  getInventoryLocationName,
  getInventoryLocationType,
  getSkuChannelRisk,
  getTransferableStock,
} from '@/lib/greenfood-channel-data';
import { InventoryBundleModal } from '@/components/inventory/inventory-bundle-modal';

interface InventoryProductDetailProps {
  product: InventoryProduct | null;
  initialSkuId?: string;
  initialChannelId?: string;
  onClose: () => void;
}

type DetailTab = 'CHANNELS' | 'FORECAST' | 'LOTS' | 'HISTORY';

function formatCurrency(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function strategyStatusLabel(status: 'APPROVED' | 'EXECUTING' | 'FINISHED') {
  if (status === 'FINISHED') return '성과 확인 완료';
  if (status === 'EXECUTING') return '실행 중';
  return '검토 요청 완료';
}

function channelIcon(type: SalesChannelType) {
  if (type === 'ONLINE') return <Globe2 className="h-4 w-4" />;
  if (type === 'OFFLINE') return <Store className="h-4 w-4" />;
  return <Warehouse className="h-4 w-4" />;
}

export function InventoryProductDetail({ product, initialSkuId, initialChannelId, onClose }: InventoryProductDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>('LOTS');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSourceId, setRequestSourceId] = useState('');
  const [requestQuantity, setRequestQuantity] = useState(10);
  const [neededDate, setNeededDate] = useState('2026-08-08');
  const [requestState, setRequestState] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE');
  const [bundleOpen, setBundleOpen] = useState(false);

  useEffect(() => {
    if (!product) return;
    const requestedSkuExists = product.skus.some((sku) => sku.id === initialSkuId);
    setSelectedSkuId(requestedSkuExists ? initialSkuId ?? '' : product.skus[0]?.id ?? '');
    setActiveTab('CHANNELS');
    setImageFailed(false);
    setDescriptionExpanded(false);
    setSelectedChannelId(initialChannelId ?? '');
    setRequestSourceId('');
    setRequestOpen(false);
    setRequestState('IDLE');
    setBundleOpen(false);
  }, [initialChannelId, initialSkuId, product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !bundleOpen) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bundleOpen, onClose, product]);

  const selectedSku = useMemo<InventorySku | undefined>(() => product?.skus.find((sku) => sku.id === selectedSkuId), [product, selectedSkuId]);
  const productHistory = useMemo(() => {
    if (!product) return [];
    return INVENTORY_STRATEGY_HISTORY.filter((history) => history.productId === product.id && history.skuIds.includes(selectedSkuId));
  }, [product, selectedSkuId]);

  if (!product || !selectedSku) return null;

  const inventoryRows = getChannelInventoryBySku(selectedSku.id);
  const salesRows = inventoryRows.filter((row) => row.channelType !== 'CENTER');
  const operation = SKU_OPERATION_DATA[selectedSku.id];
  const selectedChannel = (inventoryRows.find((row) => row.id === selectedChannelId) ?? salesRows.find((row) => row.health === 'SHORTAGE') ?? salesRows[0] ?? inventoryRows[0])!;
  const loggedInSalesPoint = salesRows.find((row) => row.channelType === 'OFFLINE' && row.health === 'SHORTAGE') ?? salesRows.find((row) => row.channelType === 'OFFLINE') ?? salesRows[0];
  const requestDestination = selectedChannel.channelType === 'CENTER' ? loggedInSalesPoint : selectedChannel;
  const sourceCandidates = inventoryRows
    .filter((row) => row.id !== requestDestination?.id)
    .sort((left, right) => {
      const centerPriority = Number(right.channelType === 'CENTER' && right.fulfillmentCenter === requestDestination?.fulfillmentCenter)
        - Number(left.channelType === 'CENTER' && left.fulfillmentCenter === requestDestination?.fulfillmentCenter);
      return centerPriority || getTransferableStock(right) - getTransferableStock(left);
    });
  const requestSource = sourceCandidates.find((row) => row.id === requestSourceId) ?? sourceCandidates[0];
  const requestMode = requestSource?.channelType === 'CENTER' && requestSource.fulfillmentCenter === requestDestination?.fulfillmentCenter
    ? '물류센터 보충'
    : requestSource && requestDestination && requestSource.fulfillmentCenter === requestDestination.fulfillmentCenter
      ? '재고 재할당'
      : 'RT';
  const transferableQuantity = requestSource ? getTransferableStock(requestSource) : 0;
  const validatedQuantity = Math.min(Math.max(1, requestQuantity), Math.max(1, transferableQuantity));
  const baseLots = operation?.lots ?? [];
  const baseLotTotal = Math.max(1, baseLots.reduce((sum, lot) => sum + lot.quantity, 0));
  let assignedStock = 0;
  let assignedOutbound = 0;
  const selectedChannelLots = baseLots.map((lot, index) => {
    const isLast = index === baseLots.length - 1;
    const quantity = isLast
      ? Math.max(0, selectedChannel.stock - assignedStock)
      : Math.round(selectedChannel.stock * (lot.quantity / baseLotTotal));
    const reservedQuantity = isLast
      ? Math.max(0, selectedChannel.outboundScheduled - assignedOutbound)
      : Math.min(quantity, Math.round(selectedChannel.outboundScheduled * (lot.quantity / baseLotTotal)));
    assignedStock += quantity;
    assignedOutbound += reservedQuantity;
    return {
      ...lot,
      id: `${lot.id}-${selectedChannel.id}`,
      quantity,
      reservedQuantity,
      availableQuantity: Math.max(0, quantity - reservedQuantity),
      location: getInventoryLocationName(selectedChannel),
    };
  });
  const nearestExpiryLot = selectedChannelLots.find((lot) => lot.expiryDate);
  const skuRiskStatus = getSkuChannelRisk(selectedSku);
  const risk = RISK_META[skuRiskStatus];
  const totalDailySales = salesRows.reduce((sum, row) => sum + row.dailySales, 0);
  const totalForecast = salesRows.reduce((sum, row) => sum + row.forecast14Days, 0);
  const networkStock = inventoryRows.reduce((sum, row) => sum + row.stock, 0);
  const dailySales = Math.max(0.1, totalDailySales || selectedSku.salesVelocity);
  const expiryDay = Number((nearestExpiryLot?.expiryLabel ?? selectedSku.expiryLabel).match(/\d+/)?.[0] ?? 60);
  const forecastDays = [0, 7, 14, 30, 60, 90];
  const forecastData = forecastDays.map((day) => {
    const remaining = Math.max(0, Math.round(networkStock - dailySales * day));
    const accumulatedLoss = Math.round(((networkStock + remaining) / 2) * day * selectedSku.sellingPrice * 0.00018 / 10000);
    return { label: day === 0 ? '현재' : `D+${day}`, remaining, accumulatedLoss };
  });

  const startAiStrategy = () => {
    const query = new URLSearchParams({ productId: product.id, skuId: selectedSku.id, channelId: requestDestination?.id ?? selectedChannel.id });
    router.push(`/strategy/generate?${query.toString()}`);
  };

  const openTransferRequest = () => {
    const preferredSource = sourceCandidates.find((row) => row.id === requestSourceId) ?? sourceCandidates[0];
    setRequestSourceId(preferredSource?.id ?? '');
    setRequestQuantity(Math.min(20, Math.max(1, preferredSource ? getTransferableStock(preferredSource) : 1)));
    setRequestState('IDLE');
    setRequestOpen(true);
  };

  const sendTransferRequest = () => {
    setRequestState('SENDING');
    window.setTimeout(() => setRequestState('SENT'), 850);
  };

  return (
    <div className="fixed inset-0 z-50 !m-0 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="inventory-product-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex h-dvh w-full max-w-7xl flex-col overflow-hidden bg-[#f7f8fa] shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">현대그린푸드</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">R1 · 냉동 완제품</span>
              {selectedChannel && <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${CHANNEL_TYPE_META[selectedChannel.channelType].className}`}>판매 채널 · {CHANNEL_TYPE_META[selectedChannel.channelType].label}</span>}
              {selectedChannel && <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${INVENTORY_LOCATION_META[getInventoryLocationType(selectedChannel)].className}`}>재고 위치 · {INVENTORY_LOCATION_META[getInventoryLocationType(selectedChannel)].label}</span>}
              <span className="font-mono text-[11px] font-semibold text-slate-500">{selectedSku.code}</span>
              <span className="text-[11px] text-slate-400">최근 동기화 2026.08.06 05:00</span>
            </div>
            <h2 id="inventory-product-title" className="truncate text-xl font-bold tracking-tight text-slate-950">{selectedSku.optionLabel}</h2>
            <p className="mt-1 text-sm text-slate-500">{product.name} · {product.brand} · {product.category}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setBundleOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0F4C3A] bg-white px-4 text-xs font-bold text-[#0F4C3A] transition hover:bg-emerald-50">
              <Layers3 className="h-4 w-4" /> 번들 구성
            </button>
            <button type="button" onClick={startAiStrategy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B]">
              <Sparkles className="h-4 w-4 text-amber-300" /> AI 최적화 요청
            </button>
            <button type="button" onClick={onClose} aria-label="SKU 상세 닫기" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                {!imageFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={operation?.imageUrl ?? product.imageUrl} alt={operation?.imageAlt ?? product.imageAlt} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
                ) : <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400"><ImageOff className="h-8 w-8" /><span className="text-xs">이미지를 불러올 수 없습니다</span></div>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-900">SKU 정보</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(selectedSku.options).map(([key, value]) => <span key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">{key} <strong className="text-slate-900">{value}</strong></span>)}</div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                  <div className="flex items-center justify-between"><span className="text-slate-500">판매가</span><strong className="text-sm text-slate-950">{formatCurrency(selectedSku.sellingPrice)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">판매 채널</span><strong className="max-w-[150px] text-right text-slate-800">{getInventoryAllocationLabel(selectedChannel)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">실제 재고 위치</span><strong className="max-w-[150px] text-right text-slate-800">{getInventoryLocationName(selectedChannel)}</strong></div>
                  {selectedChannel.channelType === 'OFFLINE' && <div className="flex items-center justify-between"><span className="text-slate-500">담당 보충센터</span><strong className="max-w-[150px] text-right text-indigo-700">{selectedChannel.fulfillmentCenter}</strong></div>}
                  <div className="flex items-center justify-between"><span className="text-slate-500">판매 가능</span><strong className="text-emerald-700">{(selectedChannel?.availableStock ?? selectedSku.availableStock).toLocaleString()}{selectedSku.unit}</strong></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">상품 설명</p><button type="button" onClick={() => setDescriptionExpanded((current) => !current)} className="text-[10px] font-bold text-[#0F4C3A]">{descriptionExpanded ? '접기' : '펼쳐보기'}</button></div>
                <p className={`mt-2 text-xs leading-5 text-slate-600 ${descriptionExpanded ? '' : 'line-clamp-2'}`}>{product.description}</p>
                <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">동일 SKU 재고 네트워크 통합 관리 대상</div>
              </div>
            </aside>

            <div className="min-w-0 space-y-4">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <SummaryCard icon={<PackageCheck className="h-4 w-4 text-[#0F4C3A]" />} label="선택 위치 현재고" value={`${selectedChannel.stock.toLocaleString()}${selectedSku.unit}`} tooltip={`${getInventoryLocationName(selectedChannel)}에 실제 보관된 수량입니다.`} />
                <SummaryCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="판매 가능" value={`${selectedChannel.availableStock.toLocaleString()}${selectedSku.unit}`} tone="success" />
                <SummaryCard icon={<Clock3 className="h-4 w-4 text-slate-500" />} label="출고 예정" value={`${selectedChannel.outboundScheduled.toLocaleString()}${selectedSku.unit}`} />
                <SummaryCard icon={<AlertTriangle className={`h-4 w-4 ${skuRiskStatus === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'}`} />} label="SKU 위험도" value={risk.label} tone={skuRiskStatus === 'CRITICAL' ? 'risk' : 'warning'} tooltip="SKU 위험도는 판매처별 과잉·부족 불균형과 LOT 위험도 중 가장 높은 상태를 반영합니다." />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex overflow-x-auto border-b border-slate-200 px-4 pt-2">
                  <TabButton active={activeTab === 'LOTS'} onClick={() => setActiveTab('LOTS')}>재고·LOT</TabButton>
                  <TabButton active={activeTab === 'CHANNELS'} onClick={() => setActiveTab('CHANNELS')}>재고 네트워크</TabButton>
                  <TabButton active={activeTab === 'FORECAST'} onClick={() => setActiveTab('FORECAST')}>SKU 수요예측·위험분석</TabButton>
                  <TabButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')}>전략 이력 ({productHistory.length})</TabButton>
                </div>

                {activeTab === 'CHANNELS' && <div className="space-y-4 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-black text-amber-700">수요 발생 판매처</p><p className="mt-1 text-sm font-black text-slate-950">{requestDestination?.channelName}</p><p className="mt-1 text-[11px] text-slate-600">14일 예상수요 {requestDestination?.forecast14Days}{selectedSku.unit} · 판매 가능 {requestDestination?.availableStock}{selectedSku.unit}</p></div>
                    <div className="flex items-center justify-center text-xs font-black text-[#0F4C3A]">보충 우선순위 →</div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-[10px] font-black text-indigo-700">1순위 담당 물류센터</p><p className="mt-1 text-sm font-black text-slate-950">{requestDestination?.fulfillmentCenter}</p><p className="mt-1 text-[11px] text-slate-600">센터 공용재고 확인 → 채널 재할당 → 필요 시 매장 간 RT</p></div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-950">동일 SKU 재고 네트워크</p><p className="mt-1 text-[10px] text-slate-500">판매 채널의 수요와 물류센터·매장의 재고 위치를 함께 비교합니다.</p></div><div className="flex items-center gap-3"><span className="text-[10px] font-bold text-slate-500">{inventoryRows.length}개 재고 버킷</span><button type="button" onClick={openTransferRequest} disabled={!requestSource} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#0F4C3A] bg-white px-3.5 py-2 text-[11px] font-bold text-[#0F4C3A] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"><Truck className="h-3.5 w-3.5" />선택 재고로 보충 요청</button></div></div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1320px] text-left text-xs">
                        <thead className="bg-white text-[10px] font-bold text-slate-400">
                          <tr>
                            <th className="px-4 py-3">판매 채널·할당</th>
                            <th className="px-3 py-3">실제 재고 위치</th>
                            <th className="px-3 py-3 text-right">판매 가능</th>
                            <th className="px-3 py-3 text-right">안전재고</th>
                            <th className="px-3 py-3 text-right"><InlineTooltip label="이동 가능" text="이동 가능 수량 = 판매 가능 재고 - 안전재고 - 이동 요청 중 수량입니다. 물류센터 공용재고를 먼저 사용하고 부족할 때 다른 판매처 재고를 검토합니다." /></th>
                            <th className="px-3 py-3 text-right">일평균 판매</th>
                            <th className="px-3 py-3 text-right">예상 소진</th>
                            <th className="px-3 py-3">재고 수급</th>
                            <th className="px-3 py-3">보충 우선순위</th>
                            <th className="px-4 py-3 text-right">선택</th>
                          </tr>
                        </thead>
                        <tbody>{inventoryRows.map((row) => {
                          const health = INVENTORY_HEALTH_META[row.health];
                          const isCurrent = row.id === selectedChannel.id;
                          const isDestination = row.id === requestDestination?.id;
                          const isSource = row.id === requestSource?.id;
                          const movableStock = getTransferableStock(row);
                          const stockoutDays = getDaysToStockout(row);
                          const sameCenter = row.fulfillmentCenter === requestDestination?.fulfillmentCenter;
                          const suitability = isDestination
                            ? { label: '받는 판매처', className: 'border-sky-200 bg-sky-50 text-sky-700' }
                            : movableStock <= 0
                              ? { label: '이동 불가', className: 'border-rose-200 bg-rose-50 text-rose-700' }
                              : row.channelType === 'CENTER' && sameCenter
                                ? { label: '1순위 센터 보충', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' }
                                : sameCenter
                                  ? { label: '2순위 재할당', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
                                  : { label: '3순위 RT', className: 'border-amber-200 bg-amber-50 text-amber-700' };
                          return <tr key={row.id} onClick={() => { if (!isDestination) setRequestSourceId(row.id); }} className={`border-t border-slate-100 transition ${isCurrent ? 'bg-emerald-50/70' : `cursor-pointer ${isSource ? 'bg-sky-50/80' : 'hover:bg-slate-50'}`}`}>
                            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${CHANNEL_TYPE_META[row.channelType].className}`}>{channelIcon(row.channelType)}{CHANNEL_TYPE_META[row.channelType].label}</span><p className="mt-1.5 font-bold text-slate-900">{getInventoryAllocationLabel(row)}</p><p className="mt-1 text-[10px] text-slate-400">{row.channelName}</p></td>
                            <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${INVENTORY_LOCATION_META[getInventoryLocationType(row)].className}`}>{getInventoryLocationType(row) === 'CENTER' ? <Warehouse className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}{INVENTORY_LOCATION_META[getInventoryLocationType(row)].label}</span><p className="mt-1.5 font-bold text-slate-800">{getInventoryLocationName(row)}</p><p className="mt-1 text-[10px] text-slate-400">{row.region}</p></td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums text-emerald-700">{row.availableStock}{selectedSku.unit}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600">{row.safetyStock}{selectedSku.unit}</td>
                            <td className={`px-3 py-3 text-right font-extrabold tabular-nums ${movableStock > 0 ? 'text-[#0F4C3A]' : 'text-slate-300'}`}>{movableStock}{selectedSku.unit}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-700">{row.channelType === 'CENTER' ? '—' : `${row.dailySales.toFixed(1)}${selectedSku.unit}`}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-700">{stockoutDays === null ? '—' : `${stockoutDays}일`}</td>
                            <td className="px-3 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${health.className}`}>{health.label}</span></td>
                            <td className="px-3 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${suitability.className}`}>{suitability.label}</span></td>
                            <td className="px-4 py-3 text-right"><span className={`text-[10px] font-bold ${isCurrent || isSource ? 'text-[#0F4C3A]' : 'text-slate-400'}`}>{isCurrent ? '현재 조회' : isSource ? '선택됨' : isDestination ? '받는 곳' : '선택'}</span></td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </div>}

                {activeTab === 'FORECAST' && <div className="space-y-4 p-4">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><p className="font-bold text-sky-950">SKU 단위 수요예측</p><p className="mt-1 text-xs leading-5 text-sky-800">판매처별 판매이력을 합산해 SKU 수요를 예측하고, LOT 정보는 판매 가능 기간과 FEFO 조건 검증에 활용합니다.</p></div></div></div>
                  <div className="grid gap-3 sm:grid-cols-4"><InfoValue label="통합 일평균 판매" value={`${totalDailySales.toFixed(1)}${selectedSku.unit}`} /><InfoValue label="14일 예상수요" value={`${totalForecast}${selectedSku.unit}`} /><InfoValue label="재고 네트워크 총량" value={`${networkStock}${selectedSku.unit}`} /><InfoValue label="선택 위치 최근 LOT" value={nearestExpiryLot?.expiryLabel ?? selectedSku.expiryLabel} highlight /></div>
                  <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-slate-900">현재 판매속도 유지 시 재고 추이</p><p className="mt-1 text-[10px] text-slate-400">판매처 통합 수요 · 물류센터와 매장 재고 통합 기준 · 시연용 예상값</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${risk.className}`}>{risk.label}</span></div><div className="mt-4 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={forecastData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" fontSize={10} stroke="#64748b" /><YAxis yAxisId="stock" fontSize={10} stroke="#e11d48" /><YAxis yAxisId="loss" orientation="right" fontSize={10} stroke="#d97706" unit="만" /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#cbd5e1', fontSize: 11 }} /><Area yAxisId="stock" type="monotone" dataKey="remaining" fill="#ffe4e6" stroke="#e11d48" strokeWidth={2.5} name="예상 잔여재고" /><Line yAxisId="loss" type="monotone" dataKey="accumulatedLoss" stroke="#d97706" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="누적 보관손실" /><ReferenceLine yAxisId="stock" x={`D+${expiryDay}`} stroke="#be123c" strokeDasharray="3 3" /></ComposedChart></ResponsiveContainer></div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-[#0F4C3A]">위험 판단 및 추천 근거</p><p className="mt-2 text-xs leading-5 text-slate-700">{selectedSku.riskReason} 판매처별 과잉과 부족이 동시에 발생하면 추가 생산보다 담당 물류센터 보충, 동일 센터 재할당, 다른 위치 RT 순으로 검토합니다.</p></div>
                </div>}

                {activeTab === 'LOTS' && <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-950">선택 재고 위치 LOT별 현황</p><p className="mt-1 text-[11px] text-slate-500"><strong className="text-slate-700">{getInventoryLocationName(selectedChannel)}</strong>에 보관된 {getInventoryAllocationLabel(selectedChannel)} 재고를 LOT별로 확인하고 FEFO 출고순서를 적용합니다.</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{selectedChannelLots.length}개 LOT</span></div>
                  {selectedChannelLots.map((lot, index) => <article key={lot.id} className={`rounded-xl border p-4 ${index === 0 ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}><div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]"><div><div className="flex items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">FEFO {index + 1}순위</span>{index === 0 && <span className="text-[10px] font-bold text-[#0F4C3A]">먼저 출고</span>}</div><p className="mt-2 font-mono text-xs font-bold text-slate-950">{lot.id}</p><p className="mt-1 text-[10px] text-slate-500">입고 {lot.receivedAt} · {lot.location}</p></div><div><p className="text-[10px] text-slate-400">소비기한 / 판매중지</p><div className="mt-1 flex items-center gap-2"><span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-700">{lot.expiryLabel}</span><span className="text-[11px] font-medium text-slate-600">{lot.expiryDate ?? '기한 정보 없음'}</span></div><p className="mt-1 text-[10px] text-slate-500">판매중지 {lot.saleStopDate ?? '—'}</p></div><div className="grid grid-cols-3 gap-2 text-center"><InfoValue label="현재고" value={`${lot.quantity}${selectedSku.unit}`} /><InfoValue label="출고 예정" value={`${lot.reservedQuantity}${selectedSku.unit}`} /><InfoValue label="판매 가능" value={`${lot.availableQuantity}${selectedSku.unit}`} /></div></div></article>)}
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600"><Clock3 className="h-3.5 w-3.5 text-[#0F4C3A]" />FEFO를 우선 적용하고 소비기한이 같으면 입고일이 빠른 LOT를 먼저 출고합니다.</div>
                </div>}

                {activeTab === 'HISTORY' && <div className="space-y-3 p-4">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><History className="mt-0.5 h-5 w-5 text-[#0F4C3A]" /><div><p className="font-bold text-slate-900">SKU 전략 이력 {productHistory.length}건</p><p className="mt-1 text-xs text-slate-500">재할당·RT·판매전략의 예상값과 더미 성과를 비교합니다.</p></div></div>
                  {productHistory.length > 0 ? productHistory.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-bold text-[#0F4C3A]">{item.id}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{strategyStatusLabel(item.status)}</span></div><p className="mt-2 font-bold text-slate-900">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.createdAt} · {item.channel}</p></div><div className="grid grid-cols-2 gap-2 text-right text-[11px]"><div><p className="text-slate-400">예상 판매</p><p className="mt-1 font-bold text-slate-800">{item.predictedSales}{selectedSku.unit}</p></div><div><p className="text-slate-400">더미 실제 판매</p><p className="mt-1 font-bold text-emerald-700">{item.actualSales ?? '집계 중'}{item.actualSales === undefined ? '' : selectedSku.unit}</p></div></div></div></article>) : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">이 SKU에 저장된 전략이 없습니다.</div>}
                </div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {requestOpen && requestDestination && requestSource && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="transfer-request-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setRequestOpen(false); }}>
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4C3A]"><Truck className="h-4 w-4" /></span><div><p className="text-[10px] font-bold text-emerald-700">담당자 직접 요청</p><h3 id="transfer-request-title" className="text-lg font-black text-slate-950">재고 보충·재할당·RT 요청</h3></div></div><p className="mt-2 text-xs text-slate-500">AI 전략을 생성하지 않고 동일 SKU 재고 네트워크에서 이동 가능한 수량을 직접 요청합니다.</p></div>
              <button type="button" onClick={() => setRequestOpen(false)} aria-label="요청 창 닫기" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </header>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-500">요청 SKU</p><p className="mt-1 text-sm font-black text-slate-950">{selectedSku.optionLabel}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{selectedSku.code} · {product.name}</p></div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <label className="text-xs font-bold text-slate-700">보내는 재고 위치<select value={requestSource.id} onChange={(event) => { const next = sourceCandidates.find((row) => row.id === event.target.value); setRequestSourceId(event.target.value); setRequestQuantity(Math.min(20, Math.max(1, next ? getTransferableStock(next) : 1))); setRequestState('IDLE'); }} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0F4C3A]">{sourceCandidates.map((row) => <option key={row.id} value={row.id}>{getInventoryLocationName(row)} · {getInventoryAllocationLabel(row)} · 이동 가능 {getTransferableStock(row)}{selectedSku.unit}</option>)}</select></label>
                <div className="flex h-12 items-center justify-center text-center text-xs font-black text-[#0F4C3A]">{requestMode}<br />→</div>
                <div><p className="text-xs font-bold text-slate-700">받는 판매처 <span className="font-medium text-slate-400">(로그인 소속)</span></p><div className="mt-2 flex h-12 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-[#0F4C3A]"><span>{requestDestination.channelName}</span><span className="rounded-full bg-white px-2 py-1 text-[9px] text-emerald-700">고정</span></div></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">요청수량<div className="relative mt-2"><input type="number" min={1} max={Math.max(1, transferableQuantity)} value={validatedQuantity} onChange={(event) => { setRequestQuantity(Number(event.target.value)); setRequestState('IDLE'); }} className="h-11 w-full rounded-xl border border-slate-300 px-3 pr-14 text-sm font-bold outline-none focus:border-[#0F4C3A]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{selectedSku.unit}</span></div><p className="mt-1.5 text-[10px] text-slate-400">안전재고 제외 최대 {transferableQuantity}{selectedSku.unit}</p></label>
                <label className="text-xs font-bold text-slate-700">필요일<input type="date" value={neededDate} onChange={(event) => { setNeededDate(event.target.value); setRequestState('IDLE'); }} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-[#0F4C3A]" /></label>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-900">요청 전 검증</p><p className="mt-1 text-[10px] text-slate-500">시연용 운영 조건을 자동 확인합니다.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${transferableQuantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{transferableQuantity > 0 ? '요청 가능' : '이동 불가'}</span></div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ValidationItem label="보내는 위치 안전재고" value={`이동 후 ${requestSource.availableStock - validatedQuantity}${selectedSku.unit} · 기준 ${requestSource.safetyStock}${selectedSku.unit}`} valid={requestSource.availableStock - validatedQuantity >= requestSource.safetyStock} />
                  <ValidationItem label="판매 가능 수량" value={`가용 ${requestSource.availableStock}${selectedSku.unit}`} valid={validatedQuantity <= requestSource.availableStock} />
                  <ValidationItem label="보관·배송 조건" value="냉동 상품 · 냉동 이동 가능" valid />
                  <ValidationItem label="처리 방식" value={requestMode === '물류센터 보충' ? '담당 센터에서 판매처로 보충' : requestMode === '재고 재할당' ? '동일 센터 내 할당량 변경' : '다른 재고 위치 간 물리 이동'} valid />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-center sm:grid-cols-2"><div><p className="text-[10px] text-slate-400">요청 방식</p><p className="mt-1 text-sm font-black text-[#0F4C3A]">{requestMode}</p></div><div><p className="text-[10px] text-slate-400">예상 이동비</p><p className="mt-1 text-sm font-black text-slate-900">₩{(requestMode === '물류센터 보충' ? validatedQuantity * 900 : requestMode === '재고 재할당' ? validatedQuantity * 580 : validatedQuantity * 4200).toLocaleString()}</p></div></div>

              {requestState === 'SENT' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><strong>{requestMode} 검토 요청 전송 완료</strong><br />{getInventoryLocationName(requestSource)}의 {getInventoryAllocationLabel(requestSource)} 재고 {validatedQuantity}{selectedSku.unit}을 {requestDestination.channelName}으로 보내는 요청을 Teams로 전송했습니다. 실제 승인과 출고 처리는 프로젝트 범위에서 제외됩니다.</div>}
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setRequestOpen(false)} className="px-4 py-2.5 text-xs font-bold text-slate-500">취소</button><button type="button" onClick={sendTransferRequest} disabled={requestState !== 'IDLE' || transferableQuantity <= 0} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-[#0F4C3A] px-5 py-3 text-xs font-bold text-white shadow-sm disabled:bg-emerald-700 disabled:opacity-70"><Send className="h-4 w-4" />{requestState === 'SENDING' ? 'Teams 전송 중' : requestState === 'SENT' ? '검토 요청 전송 완료' : 'Teams로 검토 요청'}</button></footer>
          </section>
        </div>
      )}
      {bundleOpen && selectedChannel && (
        <InventoryBundleModal
          selectedItems={[{ product, sku: selectedSku, channel: selectedChannel }]}
          onClose={() => setBundleOpen(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = 'default', tooltip }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'risk'; tooltip?: string }) {
  const valueTone = tone === 'success' ? 'text-emerald-700' : tone === 'warning' ? 'text-orange-600' : tone === 'risk' ? 'text-red-600' : 'text-slate-950';
  return <div className="group/summary relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500">{icon}{label}{tooltip && <Info className="h-3.5 w-3.5 text-slate-400" />}</div><p className={`mt-2 text-2xl font-bold ${valueTone}`}>{value}</p>{tooltip && <div role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-slate-950 px-3 py-2.5 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/summary:visible group-hover/summary:opacity-100">{tooltip}</div>}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold transition ${active ? 'border-[#0F4C3A] text-[#0F4C3A]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{children}</button>;
}

function InlineTooltip({ label, text }: { label: string; text: string }) {
  return <span className="group/inline-tooltip relative inline-flex items-center justify-end gap-1"><span>{label}</span><Info className="h-3 w-3" /><span role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-slate-950 px-3 py-2.5 text-left text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/inline-tooltip:visible group-hover/inline-tooltip:opacity-100">{text}</span></span>;
}

function InfoValue({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-lg p-2.5 ${highlight ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'}`}><p className="text-[10px] text-slate-400">{label}</p><p className={`mt-1 text-xs font-bold ${highlight ? 'text-amber-800' : 'text-slate-800'}`}>{value}</p></div>;
}

function ValidationItem({ label, value, valid }: { label: string; value: string; valid: boolean }) {
  return <div className={`rounded-lg border p-3 ${valid ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-200 bg-rose-50'}`}><div className="flex items-center gap-1.5"><CheckCircle2 className={`h-3.5 w-3.5 ${valid ? 'text-emerald-600' : 'text-rose-600'}`} /><p className={`text-[10px] font-bold ${valid ? 'text-emerald-800' : 'text-rose-700'}`}>{label}</p></div><p className="mt-1.5 text-[10px] text-slate-600">{value}</p></div>;
}
