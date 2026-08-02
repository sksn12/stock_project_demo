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

function formatCurrency(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
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
        if (activeTab === 'AI') return true;
        if (!normalizedQuery) return true;
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
  const estimatedMarginRate = suggestedPrice > 0 ? Math.round(((suggestedPrice - estimatedCost) / suggestedPrice) * 100) : 0;
  const includesWellness = bundleItems.some(({ product }) => product.affiliate === '현대웰니스');
  const validations: Array<{ label: string; detail: string; status: 'PASS' | 'WARNING' | 'BLOCK'; icon: ReactNode }> = [
    {
      label: '배송·보관 호환성',
      detail: storageProfiles.size > 1 ? `${Array.from(storageProfiles).join('·')} 상품이 함께 있어 분리 배송이 필요합니다.` : `${Array.from(storageProfiles)[0]} 기준으로 합배송할 수 있습니다.`,
      status: storageProfiles.size > 1 ? 'WARNING' : 'PASS', icon: <Truck className="h-4 w-4" />,
    },
    {
      label: '소비기한·행사기간',
      detail: nearExpiryItems.length > 0 ? `${nearExpiryItems.map(({ sku }) => sku.optionLabel).join(', ')}은 행사 종료일을 D-1 이전으로 설정해야 합니다.` : '선택 SKU 모두 기본 14일 행사 운영이 가능합니다.',
      status: nearExpiryItems.length > 0 ? 'WARNING' : 'PASS', icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      label: '예상 마진',
      detail: `추천가 적용 후 추정 공헌마진 ${estimatedMarginRate}%입니다. 내부 기준 15% 이상을 충족합니다.`,
      status: estimatedMarginRate >= 15 ? 'PASS' : 'BLOCK', icon: <BadgeDollarSign className="h-4 w-4" />,
    },
    {
      label: '판매 제한·표현 검토',
      detail: includesWellness ? '건강기능식품이 포함되어 효능 표현과 광고 문구의 사전 검토가 필요합니다.' : '현재 카탈로그 기준 판매 제한 상품은 없습니다.',
      status: includesWellness ? 'WARNING' : 'PASS', icon: <Ban className="h-4 w-4" />,
    },
    {
      label: '판매 가능 재고',
      detail: `최대 ${maxBundleQuantity}세트까지 모든 구성 SKU의 가용재고가 확보됩니다.`,
      status: maxBundleQuantity > 0 ? 'PASS' : 'BLOCK', icon: <ShieldCheck className="h-4 w-4" />,
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

  const updateSelectedSku = (productId: string, skuId: string) => {
    setSkuSelections((current) => ({ ...current, [productId]: skuId }));
    setBundleLines((current) => current.map((line) => line.productId === productId ? { ...line, skuId } : line));
    setCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="bundle-modal-title">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="bundle-modal-title" className="text-lg font-bold text-slate-950">계열사 교차 번들 구성</h2>
              <p className="mt-1 text-xs text-slate-500">기준 SKU를 다른 계열사의 정확한 SKU와 결합해 판매 가능 수량을 계산합니다.</p>
              <p className="mt-2 inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700"><span className="mr-1 text-[#0F4C3A]">구성 기준</span>{targetProduct.name} / {targetSku.optionLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="번들 모달 닫기" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">번들 기준 SKU</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">{targetProduct.name}</p>
                <p className="mt-1 text-xs text-slate-600">{targetSku.optionLabel} · <span className="font-mono">{targetSku.code}</span></p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#0F4C3A]">{formatCurrency(targetSku.sellingPrice)}</p>
                <p className="text-[11px] text-slate-500">판매 가능 {targetSku.availableStock}{targetSku.unit}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-1 border-b border-slate-200">
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
              return (
                <article key={product.id} className={`rounded-2xl border p-4 transition ${isAdded ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-[#0F4C3A]">{product.affiliate}</span>
                        {activeTab === 'AI' && recommendation && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">적합도 {recommendation.fitScore}%</span>}
                      </div>
                      <p className="mt-1 font-bold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{product.category}</p>
                    </div>
                    <button type="button" onClick={() => addProduct(product)} disabled={isAdded} aria-label={`${product.name} 번들에 추가`} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isAdded ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 text-[#0F4C3A] hover:bg-emerald-50'}`}>
                      {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                  {activeTab === 'AI' && recommendation && <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-4 text-slate-600">{recommendation.reason}</p>}
                  <label className="mt-3 block text-[10px] font-bold text-slate-500">
                    결합할 SKU
                    <select value={selectedSkuId} onChange={(event) => updateSelectedSku(product.id, event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]">
                      {product.skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.optionLabel} · 재고 {sku.availableStock}</option>)}
                    </select>
                  </label>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{selectedSku.code}</span><strong className="text-slate-800">{formatCurrency(selectedSku.sellingPrice)}</strong>
                  </div>
                </article>
              );
            })}
          </div>

          {resolvedLines.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-900">현재 번들 구성 · {resolvedLines.length + 1}개 상품</p>
                <button type="button" onClick={() => { setBundleLines([]); setCompleted(false); }} className="text-[11px] font-bold text-slate-500 hover:text-rose-600">전체 해제</button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <span><strong>{targetProduct.name}</strong> · {targetSku.optionLabel}</span><span className="font-bold text-[#0F4C3A]">기준</span>
                </div>
                {resolvedLines.map(({ product, sku }) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                    <span className="min-w-0 truncate"><strong>{product.name}</strong> · {sku.optionLabel}</span>
                    <button type="button" onClick={() => { setBundleLines((current) => current.filter((line) => line.productId !== product.id)); setCompleted(false); }} aria-label={`${product.name} 번들에서 제거`} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 text-center">
                <div><p className="text-[10px] text-slate-500">판매 가능 번들</p><p className="mt-1 text-lg font-bold text-slate-900">{maxBundleQuantity}세트</p></div>
                <div><p className="text-[10px] text-slate-500">개별 판매가 합계</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(listPrice)}</p></div>
                <div><p className="text-[10px] text-slate-500">추천 번들가</p><p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(suggestedPrice)}</p></div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-xs font-bold text-slate-900">번들 사전 검증</p><p className="mt-0.5 text-[10px] text-slate-500">저장 전에 물류·기한·수익·판매 제한 조건을 확인합니다.</p></div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${hasBlockingValidation ? 'border-rose-200 bg-rose-50 text-rose-700' : warningCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>차단 {blockingCount} · 확인 {warningCount} · 통과 {passedValidations.length}</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {priorityValidations.map((item) => (
                    <div key={item.label} className={`flex items-start gap-2.5 rounded-xl border p-3 ${item.status === 'PASS' ? 'border-emerald-200 bg-emerald-50/60' : item.status === 'WARNING' ? 'border-amber-200 bg-amber-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
                      <span className={item.status === 'PASS' ? 'text-emerald-700' : item.status === 'WARNING' ? 'text-amber-700' : 'text-rose-700'}>{item.status === 'WARNING' ? <AlertTriangle className="h-4 w-4" /> : item.icon}</span>
                      <div><p className="text-[11px] font-bold text-slate-800">{item.label} <span className="ml-1 text-[9px]">{item.status === 'PASS' ? '통과' : item.status === 'WARNING' ? '확인 필요' : '차단'}</span></p><p className="mt-1 text-[10px] leading-4 text-slate-600">{item.detail}</p></div>
                    </div>
                  ))}
                  {priorityValidations.length === 0 && <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />즉시 확인이 필요한 경고나 차단 항목이 없습니다.</div>}
                </div>
                {passedValidations.length > 0 && <div className="mt-2"><button type="button" onClick={() => setShowPassedValidation((current) => !current)} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#0F4C3A]">통과 항목 {passedValidations.length}개 {showPassedValidation ? '접기' : '보기'}{showPassedValidation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>{showPassedValidation && <div className="mt-2 grid gap-2 md:grid-cols-2">{passedValidations.map((item) => <div key={item.label} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5"><span className="text-emerald-700">{item.icon}</span><div><p className="text-[10px] font-bold text-slate-700">{item.label} · 통과</p><p className="mt-0.5 text-[9px] leading-4 text-slate-500">{item.detail}</p></div></div>)}</div>}</div>}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <button type="button" onClick={() => setRevenueExpanded((current) => !current)} className="flex w-full items-center justify-between text-left"><span><span className="block text-[11px] font-bold text-slate-900">계열사별 예상 매출 배분</span><span className="mt-0.5 block text-[9px] text-slate-400">개별 판매가 비중 기준 · {revenueByAffiliate.length}개 계열사</span></span>{revenueExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}</button>
                  {revenueExpanded && <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                    {revenueByAffiliate.map((item) => (
                      <div key={item.affiliate} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-[10px]"><span className="font-semibold text-slate-600">{item.affiliate}</span><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0F4C3A]" style={{ width: `${item.share}%` }} /></div><span className="font-bold text-slate-800">{item.share}% · {formatCurrency(item.amount)}</span></div>
                    ))}
                  </div>}
                </div>
              </div>
              {completed && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">번들 초안이 저장되었습니다. 실제 판매 등록 없이 시뮬레이션용 구성만 생성했습니다.</div>}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100">취소</button>
          <button type="button" onClick={() => setCompleted(true)} disabled={resolvedLines.length === 0 || hasBlockingValidation} className="rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
            번들 초안 저장 ({resolvedLines.length + 1}개 상품)
          </button>
        </footer>
      </section>
    </div>
  );
}
