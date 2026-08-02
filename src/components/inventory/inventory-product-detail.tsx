'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  History,
  ImageOff,
  Info,
  Layers3,
  MapPin,
  PackageCheck,
  ShieldAlert,
  TrendingDown,
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
  RISK_META,
  SKU_OPERATION_DATA,
} from '@/lib/inventory-control-data';

interface InventoryProductDetailProps {
  product: InventoryProduct | null;
  onClose: () => void;
}

type DetailTab = 'SKU' | 'FORECAST' | 'HISTORY';

function formatCurrency(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
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

export function InventoryProductDetail({ product, onClose }: InventoryProductDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('SKU');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [lotsExpanded, setLotsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setActiveTab('SKU');
    setSelectedSkuId(product.skus[0]?.id ?? '');
    setImageFailed(false);
    setBundleOpen(false);
    setLotsExpanded(false);
    setDescriptionExpanded(false);
    setExpandedHistoryId(null);
  }, [product]);

  useEffect(() => {
    setImageFailed(false);
    setLotsExpanded(false);
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
  const totalStock = product.skus.reduce((sum, sku) => sum + sku.stock, 0);
  const availableStock = product.skus.reduce((sum, sku) => sum + sku.availableStock, 0);
  const riskSkus = product.skus.filter((sku) => ['WARNING', 'CRITICAL'].includes(sku.riskStatus));
  const dailySales = Math.max(0.1, selectedSku.salesVelocity);
  const expectedRemain30 = Math.max(0, Math.round(selectedSku.stock - dailySales * 30));
  const expectedDepletionDays = Math.ceil(selectedSku.stock / dailySales);
  const expiryDay = Number(selectedSku.expiryLabel.match(/\d+/)?.[0] ?? 60);
  const expectedRemainAtExpiry = Math.max(0, Math.round(selectedSku.stock - dailySales * expiryDay));
  const estimatedLoss = Math.round(
    expectedRemainAtExpiry * selectedSku.sellingPrice * (product.affiliate === '현대리바트' ? 0.18 : 0.28)
  );
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
        className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-product-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[#f7f8fa] shadow-2xl animate-in slide-in-from-right duration-200">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${affiliateMeta.soft} ${affiliateMeta.accent} ${affiliateMeta.border}`}>
                  {product.affiliate}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500">{product.productCode}</span>
                <span className="text-[11px] text-slate-400">최근 동기화 {product.updatedAt}</span>
              </div>
              <h2 id="inventory-product-title" className="truncate text-xl font-bold tracking-tight text-slate-950">{product.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{product.brand} · {product.category}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setBundleOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-[#0F4C3A]">
                <Layers3 className="h-4 w-4 text-amber-300" /> 선택 SKU로 번들 구성
              </button>
              <button type="button" onClick={onClose} aria-label="상품 상세 닫기" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-5 p-6 lg:grid-cols-[300px_minmax(0,1fr)]">
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
                  <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/30 bg-slate-950/65 px-3 py-2 text-xs text-white backdrop-blur-md">{selectedSku.optionLabel} · 선택 SKU 이미지</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-900">현재 선택 SKU</p>
                  <p className="mt-2 font-bold text-[#0F4C3A]">{selectedSku.optionLabel}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{selectedSku.code}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(selectedSku.options).map(([key, value]) => (
                      <span key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">{key} <strong className="text-slate-900">{value}</strong></span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">판매가</span><strong>{formatCurrency(selectedSku.sellingPrice)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">판매 가능</span><strong className="text-emerald-700">{selectedSku.availableStock}{selectedSku.unit}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">기한·시즌</span><strong>{selectedSku.expiryLabel}</strong></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-900">상품 설명</p><button type="button" onClick={() => setDescriptionExpanded((current) => !current)} className="text-[10px] font-bold text-[#0F4C3A]">{descriptionExpanded ? '접기' : '펼쳐보기'}</button></div>
                  <p className={`mt-2 text-xs leading-5 text-slate-600 ${descriptionExpanded ? '' : 'line-clamp-2'}`}>{product.description}</p>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{product.channel}</div>
                </div>
              </aside>

              <div className="min-w-0 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryCard icon={<PackageCheck className="h-4 w-4 text-[#0F4C3A]" />} label="총 재고" value={`${totalStock.toLocaleString()}개`} />
                  <SummaryCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="판매 가능" value={`${availableStock.toLocaleString()}개`} tone="success" />
                  <SummaryCard icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} label="위험 SKU" value={`${riskSkus.length}개`} tone="risk" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex overflow-x-auto border-b border-slate-200 px-4 pt-2">
                    <TabButton active={activeTab === 'SKU'} onClick={() => setActiveTab('SKU')}>상품·SKU 정보</TabButton>
                    <TabButton active={activeTab === 'FORECAST'} onClick={() => setActiveTab('FORECAST')}>수요예측·위험분석</TabButton>
                    <TabButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')}>지난 전략이력 ({productHistory.length})</TabButton>
                  </div>

                  {activeTab === 'SKU' && (
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                        <Building2 className="h-4 w-4 text-[#0F4C3A]" /><span className="font-semibold text-slate-800">{product.name}</span><ChevronRight className="h-3.5 w-3.5" /><span>하위 SKU {product.skus.length}개</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[740px] text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            <tr><th className="px-4 py-3">SKU 코드 / 옵션</th><th className="px-3 py-3 text-right">현재고</th><th className="px-3 py-3 text-right">판매 가능</th><th className="px-3 py-3 text-right">예약</th><th className="px-3 py-3">기한·시즌</th><th className="px-3 py-3">위험도</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {product.skus.map((sku) => {
                              const risk = RISK_META[sku.riskStatus];
                              const isSelected = selectedSkuId === sku.id;
                              const operation = SKU_OPERATION_DATA[sku.id];
                              return (
                                <tr key={sku.id} onClick={() => setSelectedSkuId(sku.id)} className={`cursor-pointer transition ${isSelected ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-300' : 'hover:bg-slate-50'}`}>
                                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div aria-hidden="true" className={`h-11 w-14 shrink-0 rounded-lg border bg-cover bg-center ${isSelected ? 'border-emerald-400' : 'border-slate-200'}`} style={{ backgroundImage: operation?.imageUrl ? `url(${operation.imageUrl})` : undefined }} /><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-semibold text-slate-900">{sku.optionLabel}</p>{isSelected && <span className="rounded-full bg-[#0F4C3A] px-1.5 py-0.5 text-[9px] font-bold text-white">선택</span>}</div><p className="mt-0.5 font-mono text-[10px] text-slate-500">{sku.code}</p><div className="mt-1 flex flex-wrap gap-1">{Object.entries(sku.options).slice(0, 2).map(([key, value]) => <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{value}</span>)}</div></div></div></td>
                                  <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-900">{sku.stock.toLocaleString()}{sku.unit}</td>
                                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{sku.availableStock.toLocaleString()}{sku.unit}</td>
                                  <td className="px-3 py-3 text-right tabular-nums text-slate-500">{sku.reservedStock.toLocaleString()}{sku.unit}</td>
                                  <td className="px-3 py-3 font-medium text-slate-700">{sku.expiryLabel}</td>
                                  <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${risk.className}`}>{risk.label} {sku.riskScore}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">선택 SKU 운영 정보</p><p className="mt-1 font-bold text-slate-900">{selectedSku.optionLabel}</p></div>
                          <button type="button" onClick={() => setBundleOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F4C3A]/20 bg-white px-3 py-2 text-[11px] font-bold text-[#0F4C3A] hover:bg-emerald-50"><Layers3 className="h-3.5 w-3.5" />번들 구성</button>
                        </div>
                        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                          <InfoPill icon={<MapPin className="h-3.5 w-3.5" />}>{selectedSku.location}</InfoPill>
                          <InfoPill icon={<CalendarClock className="h-3.5 w-3.5" />}>보관 {selectedSku.storageDays}일</InfoPill>
                          <InfoPill icon={<TrendingDown className="h-3.5 w-3.5" />}>일평균 {selectedSku.salesVelocity}개 판매</InfoPill>
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <button type="button" onClick={() => setLotsExpanded((current) => !current)} className="flex w-full flex-wrap items-start justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                          <div className="flex items-start gap-2">
                            <Warehouse className="mt-0.5 h-4 w-4 text-[#0F4C3A]" />
                            <div><p className="text-xs font-bold text-slate-900">LOT·입고 묶음별 재고</p><p className="mt-0.5 text-[10px] text-slate-500">같은 SKU 안에서도 입고일·소비기한·보관 위치가 다른 재고를 구분합니다.</p></div>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">{selectedOperation?.lots.length ?? 0}개 묶음 · 우선 출고 {selectedOperation?.lots.filter((lot) => lot.status === 'PRIORITY').length ?? 0}개 {lotsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</span>
                        </button>
                        {!lotsExpanded ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px]"><div><span className="font-bold text-slate-800">가장 먼저 출고:</span> <span className="ml-1 font-mono text-slate-600">{selectedOperation?.lots[0]?.id}</span><p className="mt-1 text-[10px] text-slate-400">{selectedOperation?.lots[0]?.expiryDate ? `${selectedOperation.lots[0].expiryDate} · ${selectedOperation.lots[0].expiryLabel}` : selectedOperation?.lots[0]?.expiryLabel}</p></div><span className="font-bold text-[#0F4C3A]">가용 {selectedOperation?.lots.reduce((sum, lot) => sum + lot.availableQuantity, 0) ?? 0}{selectedSku.unit}</span></div>
                        ) : <>
                        <div className="divide-y divide-slate-100 border-t border-slate-100">
                          {selectedOperation?.lots.map((lot) => (
                            <div key={lot.id} className="grid gap-3 px-4 py-3 text-[11px] sm:grid-cols-[1.3fr_1fr_1fr_1fr] sm:items-center">
                              <div>
                                <div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold text-slate-900">{lot.id}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${lot.status === 'PRIORITY' ? 'border-rose-200 bg-rose-50 text-rose-700' : lot.status === 'HOLD' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{lot.status === 'PRIORITY' ? '우선 출고' : lot.status === 'HOLD' ? '출고 보류' : '정상'}</span></div>
                                <p className="mt-1 text-[10px] text-slate-500">{lot.note}</p>
                              </div>
                              <div><p className="text-[9px] text-slate-400">입고일</p><p className="mt-1 font-semibold text-slate-700">{lot.receivedAt}</p></div>
                              <div><p className="text-[9px] text-slate-400">{lot.expiryDate ? '소비기한' : '입고 구분'}</p><p className="mt-1 font-semibold text-slate-700">{lot.expiryDate ? `${lot.expiryDate} · ${lot.expiryLabel}` : lot.expiryLabel}</p></div>
                              <div className="sm:text-right"><p className="text-[9px] text-slate-400">가용 / 총수량</p><p className="mt-1 font-bold text-[#0F4C3A]">{lot.availableQuantity}{selectedSku.unit} / {lot.quantity}{selectedSku.unit}</p><p className="mt-1 text-[9px] text-slate-400">{lot.location}</p></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 bg-emerald-50/50 px-4 py-2.5 text-[10px] text-emerald-800"><Clock3 className="h-3.5 w-3.5" />우선 출고 LOT부터 배정하는 선입선출 기준을 적용합니다.</div>
                        </>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'FORECAST' && (
                    <div className="space-y-4 p-4">
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="font-bold text-rose-900">{selectedSku.optionLabel} 수요예측</p><p className="mt-1 text-xs leading-5 text-rose-800">상품 전체가 아닌 선택 SKU의 재고·판매속도·기한을 기준으로 계산합니다.</p></div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <ForecastMetric label="30일 후 잔여" value={`${expectedRemain30}${selectedSku.unit}`} />
                        <ForecastMetric label="예상 소진 기간" value={`${expectedDepletionDays}일`} warning={expectedDepletionDays > expiryDay} />
                        <ForecastMetric label="기한 시점 잔여" value={`${expectedRemainAtExpiry}${selectedSku.unit}`} warning={expectedRemainAtExpiry > 0} />
                        <ForecastMetric label="예상 보관·처리 손실" value={formatCurrency(estimatedLoss)} warning />
                      </div>
                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div><p className="text-xs font-bold text-slate-900">방치 시 잔여재고 및 누적손실 예측</p><p className="mt-1 text-[10px] text-slate-400">예측범위 ±15% · 신뢰도 {confidence}%</p></div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${RISK_META[selectedSku.riskStatus].className}`}>{RISK_META[selectedSku.riskStatus].label} {selectedSku.riskScore}점</span>
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
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-[#0F4C3A]">위험 판단 및 예측 근거</p>
                        <p className="mt-2 text-xs leading-5 text-slate-700">{selectedSku.riskReason}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                          <InfoValue label="일평균 판매" value={`${selectedSku.salesVelocity}${selectedSku.unit}`} />
                          <InfoValue label="보관 기간" value={`${selectedSku.storageDays}일`} />
                          <InfoValue label="현재 재고" value={`${selectedSku.stock}${selectedSku.unit}`} />
                          <InfoValue label="기한·시즌" value={selectedSku.expiryLabel} />
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

function SummaryCard({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'success' | 'risk' }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500">{icon}{label}</div><p className={`mt-2 text-2xl font-bold ${tone === 'success' ? 'text-emerald-700' : tone === 'risk' ? 'text-rose-700' : 'text-slate-950'}`}>{value}</p></div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold transition ${active ? 'border-[#0F4C3A] text-[#0F4C3A]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{children}</button>;
}

function InfoPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-lg bg-white p-2.5 text-slate-600"><span className="text-[#0F4C3A]">{icon}</span>{children}</div>;
}

function ForecastMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className={`mt-1 text-base font-bold ${warning ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p></div>;
}

function InfoValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-800">{value}</p></div>;
}
