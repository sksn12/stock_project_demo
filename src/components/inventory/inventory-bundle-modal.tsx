'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Info,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  BUNDLE_RECOMMENDATIONS,
  INVENTORY_PRODUCTS,
  InventoryProduct,
  InventorySku,
  SKU_OPERATION_DATA,
} from '@/lib/inventory-control-data';

interface InventoryBundleModalProps {
  targetProduct: InventoryProduct;
  targetSku: InventorySku;
  onClose: () => void;
}

interface BundleLine {
  productId: string;
  skuId: string;
}

interface ValidationItem {
  label: string;
  detail: string;
  status: 'PASS' | 'WARNING' | 'BLOCK';
  icon: ReactNode;
}

function formatCurrency(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function BundleThumbnail({ product, sku, size = 'md' }: { product: InventoryProduct; sku: InventorySku; size?: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = SKU_OPERATION_DATA[sku.id]?.imageUrl ?? product.imageUrl;
  const sizeClass = size === 'sm' ? 'h-10 w-10 rounded-lg' : 'h-14 w-14 rounded-xl';

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100`}>
      {failed ? (
        <ImageOff className="h-4 w-4 text-slate-400" />
      ) : (
        <img
          src={imageUrl}
          alt={`${product.name} ${sku.optionLabel}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function InventoryBundleModal({ targetProduct, targetSku, onClose }: InventoryBundleModalProps) {
  const [activeTab, setActiveTab] = useState<'AI' | 'MANUAL'>('AI');
  const [query, setQuery] = useState('');
  const [skuSelections, setSkuSelections] = useState<Record<string, string>>({});
  const [bundleLines, setBundleLines] = useState<BundleLine[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showPassedValidation, setShowPassedValidation] = useState(false);
  const [revenueExpanded, setRevenueExpanded] = useState(false);

  const recommendationMap = useMemo(
    () => new Map(BUNDLE_RECOMMENDATIONS.map((item) => [item.productId, item])),
    []
  );

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return INVENTORY_PRODUCTS
      .filter((product) => product.id !== targetProduct.id && product.affiliate !== targetProduct.affiliate)
      .filter((product) => {
        if (activeTab === 'AI' || !normalizedQuery) return true;
        return [product.name, product.productCode, product.category, product.affiliate]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => (recommendationMap.get(b.id)?.fitScore ?? 0) - (recommendationMap.get(a.id)?.fitScore ?? 0));
  }, [activeTab, query, recommendationMap, targetProduct.affiliate, targetProduct.id]);

  const resolvedLines = useMemo(() => {
    return bundleLines.flatMap((line) => {
      const product = INVENTORY_PRODUCTS.find((item) => item.id === line.productId);
      const sku = product?.skus.find((item) => item.id === line.skuId);
      return product && sku ? [{ product, sku }] : [];
    });
  }, [bundleLines]);

  const bundleSkus = [targetSku, ...resolvedLines.map((line) => line.sku)];
  const maxBundleQuantity = Math.min(...bundleSkus.map((sku) => sku.availableStock));
  const listPrice = bundleSkus.reduce((sum, sku) => sum + sku.sellingPrice, 0);
  const suggestedPrice = Math.round((listPrice * 0.9) / 1000) * 1000;
  const discountAmount = Math.max(0, listPrice - suggestedPrice);
  const discountRate = listPrice > 0 ? Math.round((discountAmount / listPrice) * 100) : 0;
  const bundleItems = [{ product: targetProduct, sku: targetSku }, ...resolvedLines];
  const storageProfiles = new Set(bundleItems.map(({ product, sku }) => (
    sku.options['보관'] ?? (product.affiliate === '현대리바트' ? '가구 전용배송' : '상온')
  )));
  const nearExpiryItems = bundleItems.filter(({ product, sku }) => {
    if (product.affiliate === '현대리바트') return false;
    const days = Number(sku.expiryLabel.match(/\d+/)?.[0] ?? 999);
    return days <= 7;
  });
  const estimatedCost = bundleItems.reduce((sum, { product, sku }) => {
    const costRate = product.affiliate === '현대리바트' ? 0.68 : product.affiliate === '현대웰니스' ? 0.57 : 0.62;
    return sum + sku.sellingPrice * costRate;
  }, 0);
  const estimatedMarginRate = suggestedPrice > 0
    ? Math.round(((suggestedPrice - estimatedCost) / suggestedPrice) * 100)
    : 0;
  const includesWellness = bundleItems.some(({ product }) => product.affiliate === '현대웰니스');

  const validations: ValidationItem[] = [
    {
      label: '배송·보관 호환성',
      detail: storageProfiles.size > 1
        ? `${Array.from(storageProfiles).join('·')} 상품이 함께 있어 분리 배송이 필요합니다.`
        : `${Array.from(storageProfiles)[0]} 기준으로 합배송할 수 있습니다.`,
      status: storageProfiles.size > 1 ? 'WARNING' : 'PASS',
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: '소비기한·행사기간',
      detail: nearExpiryItems.length > 0
        ? `${nearExpiryItems.map(({ sku }) => sku.optionLabel).join(', ')}은 행사 종료일을 D-1 이전으로 설정해야 합니다.`
        : '선택 SKU 모두 기본 14일 행사 운영이 가능합니다.',
      status: nearExpiryItems.length > 0 ? 'WARNING' : 'PASS',
      icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      label: '예상 마진',
      detail: `추천가 적용 후 추정 공헌마진 ${estimatedMarginRate}%입니다. 내부 기준은 15% 이상입니다.`,
      status: estimatedMarginRate >= 15 ? 'PASS' : 'BLOCK',
      icon: <BadgeDollarSign className="h-4 w-4" />,
    },
    {
      label: '판매 제한·표현 검토',
      detail: includesWellness
        ? '건강기능식품이 포함되어 효능 표현과 광고 문구의 사전 검토가 필요합니다.'
        : '현재 카탈로그 기준 판매 제한 상품은 없습니다.',
      status: includesWellness ? 'WARNING' : 'PASS',
      icon: <Ban className="h-4 w-4" />,
    },
    {
      label: '판매 가능 재고',
      detail: `최대 ${maxBundleQuantity}세트까지 모든 구성 SKU의 가용재고가 확보됩니다.`,
      status: maxBundleQuantity > 0 ? 'PASS' : 'BLOCK',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  const hasBlockingValidation = validations.some((item) => item.status === 'BLOCK');
  const blockingCount = validations.filter((item) => item.status === 'BLOCK').length;
  const warningCount = validations.filter((item) => item.status === 'WARNING').length;
  const passedValidations = validations.filter((item) => item.status === 'PASS');
  const priorityValidations = validations.filter((item) => item.status !== 'PASS');
  const revenueByAffiliate = Array.from(bundleItems.reduce((map, { product, sku }) => {
    map.set(product.affiliate, (map.get(product.affiliate) ?? 0) + sku.sellingPrice);
    return map;
  }, new Map<string, number>())).map(([affiliate, amount]) => ({
    affiliate,
    amount: Math.round(suggestedPrice * (amount / listPrice)),
    share: Math.round((amount / listPrice) * 100),
  }));

  const addProduct = (product: InventoryProduct) => {
    if (bundleLines.some((line) => line.productId === product.id)) return;
    const skuId = skuSelections[product.id] ?? product.skus[0].id;
    setBundleLines((current) => [...current, { productId: product.id, skuId }]);
    setCompleted(false);
  };

  const removeProduct = (productId: string) => {
    setBundleLines((current) => current.filter((line) => line.productId !== productId));
    setCompleted(false);
  };

  const updateSelectedSku = (productId: string, skuId: string) => {
    setSkuSelections((current) => ({ ...current, [productId]: skuId }));
    setBundleLines((current) => current.map((line) => line.productId === productId ? { ...line, skuId } : line));
    setCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="bundle-modal-title">
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="bundle-modal-title" className="text-lg font-bold text-slate-950">계열사 교차 번들 구성</h2>
              <p className="mt-1 text-xs text-slate-500">추천 상품의 SKU를 선택하면 가격·판매 가능 수량·운영 조건을 바로 비교합니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="번들 모달 닫기" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <BundleThumbnail product={targetProduct} sku={targetSku} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-bold text-white">기준 SKU</span>
                  <span className="text-[10px] font-semibold text-emerald-800">{targetProduct.affiliate}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{targetProduct.name} · {targetSku.optionLabel}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">{targetSku.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-right">
              <div><p className="text-[10px] text-slate-500">판매가</p><p className="text-sm font-bold text-slate-900">{formatCurrency(targetSku.sellingPrice)}</p></div>
              <div><p className="text-[10px] text-slate-500">판매 가능</p><p className="text-sm font-bold text-emerald-700">{targetSku.availableStock}{targetSku.unit}</p></div>
            </div>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="min-w-0">
              <div className="flex gap-1 border-b border-slate-200">
                <button type="button" onClick={() => setActiveTab('AI')} className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold ${activeTab === 'AI' ? 'border-[#0F4C3A] text-[#0F4C3A]' : 'border-transparent text-slate-500'}`}>
                  <Sparkles className="h-3.5 w-3.5" /> AI 연관 상품 추천
                </button>
                <button type="button" onClick={() => setActiveTab('MANUAL')} className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold ${activeTab === 'MANUAL' ? 'border-[#0F4C3A] text-[#0F4C3A]' : 'border-transparent text-slate-500'}`}>
                  <Search className="h-3.5 w-3.5" /> 직접 검색
                </button>
              </div>

              {activeTab === 'MANUAL' && (
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="다른 계열사의 상품명·코드·카테고리 검색" className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs outline-none focus:border-[#0F4C3A]" />
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {candidates.map((product) => {
                  const recommendation = recommendationMap.get(product.id);
                  const selectedSkuId = skuSelections[product.id] ?? product.skus[0].id;
                  const selectedSku = product.skus.find((sku) => sku.id === selectedSkuId) ?? product.skus[0];
                  const isAdded = bundleLines.some((line) => line.productId === product.id);
                  const candidateBundleQuantity = Math.min(targetSku.availableStock, selectedSku.availableStock);

                  return (
                    <article key={product.id} className={`rounded-2xl border p-3.5 transition ${isAdded ? 'border-emerald-400 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="flex items-start gap-3">
                        <BundleThumbnail product={product} sku={selectedSku} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#0F4C3A]">{product.affiliate}</span>
                            {isAdded && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-bold text-white"><Check className="h-2.5 w-2.5" /> 선택됨</span>}
                            {activeTab === 'AI' && recommendation && (
                              <span className="group/fit relative inline-flex cursor-help items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                                적합도 {recommendation.fitScore}% <Info className="h-2.5 w-2.5" />
                                <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-56 rounded-xl bg-slate-900 p-3 text-[10px] font-medium leading-4 text-white shadow-xl group-hover/fit:block">
                                  상품 연관성, 재고 소진 필요성, 가격 조합, 배송·보관 호환성을 종합한 추천 점수입니다.
                                </span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-bold text-slate-950">{product.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">{product.category}</p>
                        </div>
                      </div>

                      {activeTab === 'AI' && recommendation && <p className="mt-3 min-h-12 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-4 text-slate-600">{recommendation.reason}</p>}

                      <label className="mt-3 block text-[10px] font-bold text-slate-500">
                        결합할 SKU
                        <select value={selectedSkuId} onChange={(event) => updateSelectedSku(product.id, event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]">
                          {product.skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.optionLabel} · 재고 {sku.availableStock}</option>)}
                        </select>
                      </label>

                      <div className="mt-2.5 flex items-end justify-between gap-3">
                        <div className="min-w-0 text-[10px] text-slate-500">
                          <p className="truncate font-mono">{selectedSku.code}</p>
                          <p className="mt-0.5">최대 <strong className="text-slate-800">{candidateBundleQuantity}세트</strong> 구성</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">{formatCurrency(selectedSku.sellingPrice)}</p>
                          <button
                            type="button"
                            onClick={() => isAdded ? removeProduct(product.id) : addProduct(product)}
                            className={`mt-1.5 inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[10px] font-bold transition ${isAdded ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50' : 'border-[#0F4C3A] bg-[#0F4C3A] text-white hover:bg-[#0B392B]'}`}
                          >
                            {isAdded ? <><Trash2 className="h-3 w-3" /> 제거</> : <><Plus className="h-3 w-3" /> 추가</>}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="xl:sticky xl:top-0">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">현재 번들 구성</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">기준 포함 {resolvedLines.length + 1}개 상품</p>
                  </div>
                  {resolvedLines.length > 0 && <button type="button" onClick={() => { setBundleLines([]); setCompleted(false); }} className="text-[10px] font-bold text-slate-500 hover:text-rose-600">전체 해제</button>}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white p-2.5">
                    <BundleThumbnail product={targetProduct} sku={targetSku} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-950">{targetProduct.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">{targetSku.optionLabel}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-800">기준</span>
                  </div>
                  {resolvedLines.map(({ product, sku }) => (
                    <div key={product.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
                      <BundleThumbnail product={product} sku={sku} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-slate-950">{product.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-600">{sku.optionLabel} · {formatCurrency(sku.sellingPrice)}</p>
                      </div>
                      <button type="button" onClick={() => removeProduct(product.id)} aria-label={`${product.name} 번들에서 제거`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {resolvedLines.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
                      <Layers3 className="mx-auto h-5 w-5 text-slate-300" />
                      <p className="mt-2 text-[11px] font-semibold text-slate-600">추천 상품을 추가해 주세요</p>
                      <p className="mt-1 text-[9px] leading-4 text-slate-400">선택 즉시 가격과 사전 검증 결과가 표시됩니다.</p>
                    </div>
                  )}
                </div>

                {resolvedLines.length > 0 && (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                      <div className="rounded-xl bg-white p-2.5"><p className="text-[9px] text-slate-500">판매 가능 번들</p><p className="mt-1 text-base font-bold text-slate-950">{maxBundleQuantity}세트</p></div>
                      <div className="rounded-xl bg-white p-2.5"><p className="text-[9px] text-slate-500">개별 판매가 합계</p><p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(listPrice)}</p></div>
                      <div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[9px] text-emerald-700">추천 번들가</p><p className="mt-1 text-base font-bold text-emerald-800">{formatCurrency(suggestedPrice)}</p></div>
                      <div className="rounded-xl bg-white p-2.5"><p className="text-[9px] text-slate-500">할인 / 예상 마진</p><p className="mt-1 text-sm font-bold text-slate-950">{discountRate}% · {estimatedMarginRate}%</p><p className="mt-0.5 text-[9px] text-slate-400">{formatCurrency(discountAmount)} 할인</p></div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <div><p className="text-xs font-bold text-slate-950">번들 사전 검증</p><p className="mt-0.5 text-[9px] text-slate-500">물류·기한·수익·판매 제한 조건</p></div>
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${hasBlockingValidation ? 'border-rose-200 bg-rose-50 text-rose-700' : warningCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>차단 {blockingCount} · 확인 {warningCount}</span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {priorityValidations.map((item) => (
                          <div key={item.label} className={`flex items-start gap-2.5 rounded-xl border p-3 ${item.status === 'WARNING' ? 'border-amber-300 bg-amber-50/80' : 'border-rose-200 bg-rose-50/80'}`}>
                            <span className={item.status === 'WARNING' ? 'text-amber-700' : 'text-rose-700'}>{item.status === 'WARNING' ? <AlertTriangle className="h-4 w-4" /> : item.icon}</span>
                            <div><p className="text-[10px] font-bold text-slate-900">{item.label} · {item.status === 'WARNING' ? '확인 필요' : '저장 차단'}</p><p className="mt-1 text-[9px] leading-4 text-slate-600">{item.detail}</p></div>
                          </div>
                        ))}
                        {priorityValidations.length === 0 && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />확인이 필요한 항목이 없습니다.</div>}
                      </div>

                      {passedValidations.length > 0 && (
                        <div className="mt-2">
                          <button type="button" onClick={() => setShowPassedValidation((current) => !current)} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#0F4C3A]">통과 항목 {passedValidations.length}개 {showPassedValidation ? '접기' : '보기'}{showPassedValidation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
                          {showPassedValidation && <div className="mt-2 space-y-1.5">{passedValidations.map((item) => <div key={item.label} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5"><span className="text-emerald-700">{item.icon}</span><div><p className="text-[10px] font-bold text-slate-700">{item.label} · 통과</p><p className="mt-0.5 text-[9px] leading-4 text-slate-500">{item.detail}</p></div></div>)}</div>}
                        </div>
                      )}

                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <button type="button" onClick={() => setRevenueExpanded((current) => !current)} className="flex w-full items-center justify-between text-left"><span><span className="block text-[10px] font-bold text-slate-900">계열사별 예상 매출 배분</span><span className="mt-0.5 block text-[9px] text-slate-400">개별 판매가 비중 기준 · {revenueByAffiliate.length}개 계열사</span></span>{revenueExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}</button>
                        {revenueExpanded && <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">{revenueByAffiliate.map((item) => <div key={item.affiliate} className="grid grid-cols-[72px_1fr_auto] items-center gap-2 text-[9px]"><span className="truncate font-semibold text-slate-600">{item.affiliate}</span><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0F4C3A]" style={{ width: `${item.share}%` }} /></div><span className="font-bold text-slate-800">{item.share}%</span></div>)}</div>}
                      </div>
                    </div>

                    {completed && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] font-semibold leading-4 text-emerald-800">번들 초안이 저장되었습니다. 실제 판매 등록 없이 시뮬레이션용 구성만 생성했습니다.</div>}
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3.5">
          <div className="min-h-8">
            {resolvedLines.length > 0 && warningCount > 0 && !hasBlockingValidation && <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />확인 필요 {warningCount}건이 있습니다. 조건을 확인한 뒤 저장해 주세요.</p>}
            {hasBlockingValidation && <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-rose-700"><Ban className="h-3.5 w-3.5" />차단 항목 {blockingCount}건을 해결해야 저장할 수 있습니다.</p>}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100">취소</button>
            <button type="button" onClick={() => setCompleted(true)} disabled={resolvedLines.length === 0 || hasBlockingValidation} className="rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
              번들 초안 저장 ({resolvedLines.length + 1}개 상품)
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
