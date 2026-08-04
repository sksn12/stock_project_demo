'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  History,
  ImageOff,
  Info,
  Layers3,
  PackageCheck,
  ShieldAlert,
  Sparkles,
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
import { InventoryBundleModal } from '@/components/inventory/inventory-bundle-modal';
import {
  AFFILIATE_META,
  INVENTORY_STRATEGY_OUTCOMES,
  INVENTORY_STRATEGY_HISTORY,
  InventoryProduct,
  InventorySku,
  getEffectiveSkuRiskStatus,
  RISK_META,
  SKU_OPERATION_DATA,
} from '@/lib/inventory-control-data';

interface InventoryProductDetailProps {
  product: InventoryProduct | null;
  initialSkuId?: string;
  onClose: () => void;
}

type DetailTab = 'SKU' | 'FORECAST' | 'HISTORY';

function formatCurrency(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function lifecycleLabel(product: InventoryProduct) {
  return product.affiliate === '현대리바트' ? '시즌 종료' : '소비기한';
}

function lifecycleValue(product: InventoryProduct, sku: InventorySku) {
  return product.affiliate === '현대리바트'
    ? sku.expiryLabel.replace(/^시즌\s*/, '')
    : sku.expiryLabel;
}

function strategyStatusStyle(status: 'APPROVED' | 'EXECUTING' | 'FINISHED') {
  if (status === 'FINISHED') return 'border-slate-200 bg-slate-100 text-slate-700';
  if (status === 'EXECUTING') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function strategyStatusLabel(status: 'APPROVED' | 'EXECUTING' | 'FINISHED') {
  if (status === 'FINISHED') return '실행 완료';
  if (status === 'EXECUTING') return '실행 중';
  return '승인 완료';
}

export function InventoryProductDetail({ product, initialSkuId, onClose }: InventoryProductDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>('SKU');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [expandedTraceLotId, setExpandedTraceLotId] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setActiveTab('SKU');
    const requestedSkuExists = product.skus.some((sku) => sku.id === initialSkuId);
    setSelectedSkuId(requestedSkuExists ? initialSkuId ?? '' : product.skus[0]?.id ?? '');
    setImageFailed(false);
    setBundleOpen(false);
    setDescriptionExpanded(false);
    setExpandedHistoryId(null);
    setExpandedTraceLotId(null);
  }, [initialSkuId, product]);

  useEffect(() => {
    setImageFailed(false);
    setExpandedTraceLotId(null);
  }, [selectedSkuId]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !bundleOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bundleOpen, onClose, product]);

  const selectedSku = useMemo<InventorySku | undefined>(
    () => product?.skus.find((sku) => sku.id === selectedSkuId),
    [product, selectedSkuId]
  );

  const productHistory = useMemo(() => {
    if (!product) return [];
    return INVENTORY_STRATEGY_HISTORY
      .filter((history) => history.productId === product.id)
      .sort((a, b) => Number(b.skuIds.includes(selectedSkuId)) - Number(a.skuIds.includes(selectedSkuId)));
  }, [product, selectedSkuId]);

  if (!product || !selectedSku) return null;

  const affiliateMeta = AFFILIATE_META[product.affiliate];
  const selectedOperation = SKU_OPERATION_DATA[selectedSku.id];
  const nearestExpiryLot = selectedOperation?.lots.find((lot) => lot.expiryDate);
  const skuRiskStatus = getEffectiveSkuRiskStatus(selectedSku);
  const startAiStrategy = () => {
    const query = new URLSearchParams({ productId: product.id, skuId: selectedSku.id });
    router.push(`/strategy/generate?${query.toString()}`);
  };
  const dailySales = Math.max(0.1, selectedSku.salesVelocity);
  const nearestExpiryLabel = nearestExpiryLot?.expiryLabel ?? selectedSku.expiryLabel;
  const expiryDay = Number(nearestExpiryLabel.match(/\d+/)?.[0] ?? 60);
  const confidence = Math.max(72, Math.min(94, Math.round(95 - selectedSku.riskScore * 0.12)));
  const forecastDays = [0, 7, 14, 30, 60, 90];
  const forecastData = forecastDays.map((day) => {
    const remaining = Math.max(0, Math.round(selectedSku.stock - dailySales * day));
    const accumulatedLoss = Math.round(
      ((selectedSku.stock + remaining) / 2) * day * selectedSku.sellingPrice *
      (product.affiliate === '현대리바트' ? 0.00045 : 0.00018) / 10000
    );
    return { day, label: day === 0 ? '현재' : `D+${day}`, remaining, accumulatedLoss };
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50 !m-0 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-product-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section className="flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#f7f8fa] shadow-2xl animate-in slide-in-from-right duration-200">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${affiliateMeta.soft} ${affiliateMeta.accent} ${affiliateMeta.border}`}>
                  {product.affiliate}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500">{selectedSku.code}</span>
                <span className="text-[11px] text-slate-400">최근 동기화 {product.updatedAt}</span>
              </div>
              <h2 id="inventory-product-title" className="truncate text-xl font-bold tracking-tight text-slate-950">{selectedSku.optionLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">{product.name} · {product.brand} · {product.category}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={startAiStrategy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B]">
                <Sparkles className="h-4 w-4 text-amber-300" /> AI 전략 생성
              </button>
              <button type="button" onClick={() => setBundleOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#0F4C3A] hover:bg-emerald-50 hover:text-[#0F4C3A]">
                <Layers3 className="h-4 w-4 text-[#0F4C3A]" /> 번들 구성
              </button>
              <button type="button" onClick={onClose} aria-label="SKU 상세 닫기" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-5 p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                  {!imageFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedOperation?.imageUrl ?? product.imageUrl} alt={selectedOperation?.imageAlt ?? product.imageAlt} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-opacity duration-200" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                      <ImageOff className="h-8 w-8" /><span className="text-xs font-medium">상품 이미지를 불러올 수 없습니다</span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-900">옵션·가격</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(selectedSku.options).map(([key, value]) => (
                      <span key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">{key} <strong className="text-slate-900">{value}</strong></span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-center justify-between gap-3"><span className="text-slate-500">판매가</span><strong className="text-sm font-extrabold text-slate-950 tabular-nums">{formatCurrency(selectedSku.sellingPrice)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">판매 가능</span><strong className="text-emerald-700">{selectedSku.availableStock}{selectedSku.unit}</strong></div>
                    {product.affiliate === '현대리바트' && <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{lifecycleLabel(product)}</span><strong className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-bold text-amber-700">{lifecycleValue(product, selectedSku)}</strong></div>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-900">상품 설명</p><button type="button" onClick={() => setDescriptionExpanded((current) => !current)} className="text-[10px] font-bold text-[#0F4C3A]">{descriptionExpanded ? '접기' : '펼쳐보기'}</button></div>
                  <p className={`mt-2 text-xs leading-5 text-slate-600 ${descriptionExpanded ? '' : 'line-clamp-2'}`}>{product.description}</p>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{product.channel}</div>
                </div>
              </aside>

              <div className="min-w-0 space-y-4">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <SummaryCard icon={<PackageCheck className="h-4 w-4 text-[#0F4C3A]" />} label="현재고" value={`${selectedSku.stock.toLocaleString()}${selectedSku.unit}`} />
                  <SummaryCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="판매 가능" value={`${selectedSku.availableStock.toLocaleString()}${selectedSku.unit}`} tone="success" />
                  <SummaryCard icon={<Clock3 className="h-4 w-4 text-slate-500" />} label="출고 예정" value={`${selectedSku.reservedStock.toLocaleString()}${selectedSku.unit}`} />
                  <SummaryCard
                    icon={skuRiskStatus === 'SAFE' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className={`h-4 w-4 ${skuRiskStatus === 'CRITICAL' ? 'text-red-600' : skuRiskStatus === 'WARNING' ? 'text-orange-600' : 'text-yellow-700'}`} />}
                    label="SKU 위험도"
                    value={RISK_META[skuRiskStatus].label}
                    tone={skuRiskStatus === 'CRITICAL' ? 'risk' : skuRiskStatus === 'WARNING' ? 'warning' : skuRiskStatus === 'CAUTION' ? 'normal' : 'success'}
                    tooltip="SKU 위험도는 SKU 자체 판매부진 위험과 LOT별 위험도 중 가장 높은 등급을 반영합니다."
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex overflow-x-auto border-b border-slate-200 px-4 pt-2">
                    <TabButton active={activeTab === 'SKU'} onClick={() => setActiveTab('SKU')}>LOT 재고</TabButton>
                    <TabButton active={activeTab === 'FORECAST'} onClick={() => setActiveTab('FORECAST')}>수요예측·위험분석</TabButton>
                    <TabButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')}>지난 전략이력 ({productHistory.length})</TabButton>
                  </div>

                  {activeTab === 'SKU' && (
                    <div className="p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#0F4C3A]"><Warehouse className="h-4 w-4" /></span>
                          <div>
                            <p className="text-sm font-bold text-slate-950">LOT별 재고 현황</p>
                            <p className="mt-1 text-[11px] text-slate-500">기한과 출고 순서가 다른 재고를 LOT별로 비교합니다.</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {selectedOperation?.lots.length ?? 0}개 LOT · {selectedOperation?.lots.some((lot) => lot.expiryDate) ? 'FEFO 적용' : '입고순 관리'}
                        </span>
                      </div>

                      <div className="space-y-2">
                          {selectedOperation?.lots.map((lot, lotIndex) => {
                            const showRemainingWarning = lot.expiryDate && (lot.expectedRemainingAtSaleStop ?? 0) > 0;
                            const lotRisk = RISK_META[lot.riskStatus];
                            const statusLabel = lot.expiryDate
                              ? `FEFO ${lotIndex + 1}순위`
                              : lot.status === 'HOLD'
                                ? '출고 보류'
                                : lot.status === 'PRIORITY'
                                  ? '우선 배정'
                                  : '정상';
                            return (
                              <article key={lot.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.25fr)_minmax(190px,1fr)_minmax(280px,1.45fr)] lg:items-center">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{statusLabel}</span>
                                      {lot.expiryDate && <span className="group/lotrisk relative">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${lotRisk.className}`}>{lotRisk.label}</span>
                                        <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-medium leading-4 text-white opacity-0 shadow-xl transition group-hover/lotrisk:visible group-hover/lotrisk:opacity-100">
                                          {lot.expectedRemainingAtSaleStop
                                            ? `${lot.expiryLabel}이며 판매중지 시 ${lot.expectedRemainingAtSaleStop}${selectedSku.unit}가 남을 것으로 예상되어 ${lotRisk.label}으로 산정했습니다.`
                                            : `${lot.expiryLabel} 소비기한을 기준으로 ${lotRisk.label} 등급으로 산정했습니다.`}
                                        </span>
                                      </span>}
                                    </div>
                                    <p className="mt-2 truncate font-mono text-xs font-bold text-slate-950">{lot.id}</p>
                                    <p className="mt-1 truncate text-[11px] text-slate-500">입고 {lot.receivedAt} · {lot.location}</p>
                                  </div>

                                  <div className="border-slate-100 lg:border-l lg:pl-4">
                                    <p className="text-[10px] font-semibold text-slate-400">{lot.expiryDate ? '소비기한 / 판매중지' : '입고 구분'}</p>
                                    {lot.expiryDate ? <>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-md border px-2 py-1 text-xs font-extrabold ${expiryBadgeClass(lot.expiryLabel)}`}>{lot.expiryLabel}</span>
                                        <span className="whitespace-nowrap text-[11px] font-medium text-slate-600">{lot.expiryDate}</span>
                                      </div>
                                      <p className="mt-1 text-[11px] text-slate-500">판매중지 {lot.saleStopDate}</p>
                                    </> : <p className="mt-1 text-[13px] font-bold text-slate-900">{lot.expiryLabel}</p>}
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 border-slate-100 text-center lg:border-l lg:pl-4">
                                    <div><p className="text-[10px] text-slate-400">현재고</p><p className="mt-1 whitespace-nowrap text-[13px] font-bold tabular-nums text-slate-900">{lot.quantity}{selectedSku.unit}</p></div>
                                    <div><p className="text-[10px] text-slate-400">출고 예정</p><p className="mt-1 whitespace-nowrap text-[13px] font-bold tabular-nums text-slate-600">{lot.reservedQuantity}{selectedSku.unit}</p></div>
                                    <div><p className="text-[10px] text-slate-400">판매 가능</p><p className="mt-1 whitespace-nowrap text-[13px] font-extrabold tabular-nums text-emerald-700">{lot.availableQuantity}{selectedSku.unit}</p></div>
                                  </div>
                                </div>

                                {showRemainingWarning && <p className="mt-2 border-t border-amber-100 pt-2 text-[10px] font-semibold text-amber-700">판매중지 시 {lot.expectedRemainingAtSaleStop}{selectedSku.unit}가 남을 것으로 예상됩니다.</p>}
                                {lot.traceabilityCode && <div className="mt-2 border-t border-sky-100 pt-2 text-[10px]">
                                  <button type="button" onClick={() => setExpandedTraceLotId((current) => current === lot.id ? null : lot.id)} className="inline-flex items-center gap-1.5 font-bold text-sky-700 hover:text-sky-900">
                                    <Info className="h-3.5 w-3.5" /> 이력추적 {lot.recallStatus === 'RECALL' ? '회수 대상' : '정상'} · {expandedTraceLotId === lot.id ? '접기' : '정보 보기'}
                                  </button>
                                  {expandedTraceLotId === lot.id && <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-slate-600"><span><b className="text-slate-800">이력추적번호</b> {lot.traceabilityCode}</span><span><b className="text-slate-800">제조업체</b> {lot.manufacturer}</span><span className={`font-bold ${lot.recallStatus === 'RECALL' ? 'text-rose-600' : 'text-emerald-700'}`}>{lot.recallStatus === 'RECALL' ? '회수 대상' : '회수 이상 없음'}</span></div>}
                                </div>}
                              </article>
                            );
                          })}
                      </div>
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
                          <Clock3 className="h-3.5 w-3.5 text-[#0F4C3A]" />
                          {selectedOperation?.lots.some((lot) => lot.expiryDate)
                            ? 'FEFO: 소비기한이 가까운 LOT부터 출고합니다.'
                            : '입고 시점과 배정 우선순위에 따라 재고를 출고합니다.'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'FORECAST' && (
                    <div className="space-y-4 p-4">
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="font-bold text-rose-900">{selectedSku.optionLabel} 수요예측</p><p className="mt-1 text-xs leading-5 text-rose-800">수요예측은 선택한 SKU 전체를 기준으로 계산하며, LOT 정보는 소비기한과 판매중지 조건을 확인하는 데만 활용합니다.</p></div></div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-[#0F4C3A]">위험 판단 및 예측 근거</p>
                            <p className="mt-2 text-xs leading-5 text-slate-700">{selectedSku.riskReason}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${RISK_META[skuRiskStatus].className}`}>{RISK_META[skuRiskStatus].label}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                          <InfoValue label="일평균 판매" value={`${selectedSku.salesVelocity}${selectedSku.unit}`} />
                          <InfoValue label="보관 기간" value={`${selectedSku.storageDays}일`} />
                          <InfoValue label="현재 재고" value={`${selectedSku.stock}${selectedSku.unit}`} />
                          <InfoValue label={nearestExpiryLot ? '가장 가까운 LOT' : '기한·시즌'} value={nearestExpiryLabel} highlight={Boolean(nearestExpiryLot)} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div><p className="text-xs font-bold text-slate-900">방치 시 잔여재고 및 누적손실 예측</p><p className="mt-1 text-[10px] text-slate-400">예측범위 ±15% · 신뢰도 {confidence}%</p></div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${RISK_META[skuRiskStatus].className}`}>{RISK_META[skuRiskStatus].label}</span>
                        </div>
                        <div className="mt-4 h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={forecastData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="label" fontSize={10} stroke="#64748b" />
                              <YAxis yAxisId="stock" fontSize={10} stroke="#e11d48" />
                              <YAxis yAxisId="loss" orientation="right" fontSize={10} stroke="#d97706" unit="만" />
                              <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#cbd5e1', fontSize: 11 }} formatter={(value: number, name: string) => name === 'remaining' ? [`${value}${selectedSku.unit}`, '예상 잔여재고'] : [`₩${value}만원`, '누적 보관손실']} />
                              <Area yAxisId="stock" type="monotone" dataKey="remaining" fill="#ffe4e6" stroke="#e11d48" strokeWidth={2.5} name="remaining" />
                              <Line yAxisId="loss" type="monotone" dataKey="accumulatedLoss" stroke="#d97706" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="accumulatedLoss" />
                              <ReferenceLine yAxisId="stock" x={`D+${expiryDay}`} stroke="#be123c" strokeDasharray="3 3" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'HISTORY' && (
                    <div className="space-y-3 p-4">
                      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <History className="mt-0.5 h-5 w-5 shrink-0 text-[#0F4C3A]" />
                        <div><p className="font-bold text-slate-900">상품 전략이력 {productHistory.length}건</p><p className="mt-1 text-xs leading-5 text-slate-500">현재 선택한 SKU와 일치하는 전략을 먼저 표시하며, 카드에서 실제 적용 SKU를 확인할 수 있습니다.</p></div>
                      </div>
                      {productHistory.length > 0 ? productHistory.map((history) => {
                        const targetSkus = product.skus.filter((sku) => history.skuIds.includes(sku.id));
                        const matchesSelected = history.skuIds.includes(selectedSku.id);
                        const variance = history.actualSales === undefined ? null : history.actualSales - history.predictedSales;
                        const outcome = INVENTORY_STRATEGY_OUTCOMES[history.id];
                        return (
                          <article key={history.id} className={`rounded-xl border p-4 ${matchesSelected ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold text-[#0F4C3A]">{history.id}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${strategyStatusStyle(history.status)}`}>{strategyStatusLabel(history.status)}</span>{matchesSelected && <span className="rounded-full bg-[#0F4C3A] px-2 py-0.5 text-[10px] font-bold text-white">선택 SKU 적용</span>}</div><p className="mt-2 font-bold text-slate-900">{history.title}</p><p className="mt-1 text-[11px] text-slate-500">{history.createdAt} · {history.strategyType} · {history.channel}</p></div>
                              <div className="flex flex-wrap items-center gap-2">{outcome && <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white">{outcome.resultLabel}</span>}<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">할인 {history.discountRate}%</span><button type="button" aria-expanded={expandedHistoryId === history.id} onClick={() => setExpandedHistoryId((current) => current === history.id ? null : history.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-[#0F4C3A] hover:bg-emerald-50">{expandedHistoryId === history.id ? '접기' : '상세 보기'}{expandedHistoryId === history.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button></div>
                            </div>
                            {expandedHistoryId === history.id && <>
                            <div className="mt-3 flex flex-wrap gap-1.5">{targetSkus.map((sku) => <span key={sku.id} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">{sku.optionLabel} · {sku.code}</span>)}</div>
                            <p className="mt-3 text-xs leading-5 text-slate-600">{history.summary}</p>
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
                              <InfoValue label="예상 판매" value={`${history.predictedSales}개`} />
                              <InfoValue label="실제 판매" value={history.actualSales === undefined ? '집계 전' : `${history.actualSales}개`} />
                              <InfoValue label="예상 이익" value={formatCurrency(history.expectedProfit)} />
                              <InfoValue label="예측 오차" value={variance === null ? '집계 전' : `${variance > 0 ? '+' : ''}${variance}개`} />
                            </div>
                            {outcome && (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[#0F4C3A]" /><p className="text-[11px] font-bold text-slate-900">전략 실행 전후 비교</p></div>
                                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white">{outcome.resultLabel}</span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <InfoValue label="실행 전 재고" value={`${outcome.beforeStock}개`} />
                                  <InfoValue label="현재·종료 재고" value={outcome.afterStock === undefined ? '실행 전' : `${outcome.afterStock}개`} />
                                  <InfoValue label="목표 소진율" value={`${outcome.targetSellThrough}%`} />
                                  <InfoValue label="실제 소진율" value={outcome.actualSellThrough === undefined ? '집계 전' : `${outcome.actualSellThrough}%`} />
                                </div>
                                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600">{outcome.resultSummary}</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                                  {outcome.timeline.map((item, index) => (
                                    <div key={`${history.id}-${item.date}-${item.label}`} className="relative rounded-lg border border-slate-200 px-3 py-2">
                                      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.state === 'DONE' ? 'bg-emerald-500' : item.state === 'CURRENT' ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-slate-300'}`} /><span className="text-[9px] font-bold text-slate-400">{item.date}</span></div>
                                      <p className="mt-1 text-[10px] font-semibold text-slate-700">{index + 1}. {item.label}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            </>}
                          </article>
                        );
                      }) : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">이 상품에 저장된 과거 전략이 없습니다.</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {bundleOpen && <InventoryBundleModal targetProduct={product} targetSku={selectedSku} onClose={() => setBundleOpen(false)} />}
    </>
  );
}

function SummaryCard({ icon, label, value, tone = 'default', tooltip }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'success' | 'normal' | 'warning' | 'risk'; tooltip?: string }) {
  const valueTone = tone === 'success' ? 'text-emerald-700' : tone === 'normal' ? 'text-yellow-800' : tone === 'warning' ? 'text-orange-600' : tone === 'risk' ? 'text-red-600' : 'text-slate-950';
  return <div className="group/summary relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500">{icon}{label}{tooltip && <Info className="h-3.5 w-3.5 text-slate-400" />}</div><p className={`mt-2 text-2xl font-bold ${valueTone}`}>{value}</p>{tooltip && <div role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-slate-950 px-3 py-2.5 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/summary:visible group-hover/summary:opacity-100">{tooltip}</div>}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold transition ${active ? 'border-[#0F4C3A] text-[#0F4C3A]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{children}</button>;
}

function expiryBadgeClass(expiryLabel: string) {
  const days = Number(expiryLabel.match(/\d+/)?.[0] ?? 999);
  return days <= 30
    ? 'border-rose-300 bg-rose-50 text-rose-700'
    : 'border-amber-300 bg-amber-50 text-amber-700';
}

function InfoValue({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-lg p-2.5 ${highlight ? 'bg-white' : 'bg-slate-50'}`}><p className="text-[10px] text-slate-400">{label}</p>{highlight ? <span className="mt-1 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-700">{value}</span> : <p className="mt-1 text-xs font-bold text-slate-800">{value}</p>}</div>;
}
