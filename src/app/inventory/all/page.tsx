'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { InventoryProductDetail } from '@/components/inventory/inventory-product-detail';
import {
  AFFILIATE_META,
  ALL_AFFILIATES,
  INVENTORY_PRODUCTS,
  InventoryAffiliate,
  InventoryProduct,
  InventorySku,
  getEffectiveSkuRiskStatus,
  RISK_META,
  SKU_OPERATION_DATA,
  SkuRiskStatus,
} from '@/lib/inventory-control-data';

type AffiliateFilter = 'ALL' | InventoryAffiliate;
type ViewTab = 'ALL' | 'RISK';

interface SkuListItem {
  product: InventoryProduct;
  sku: InventorySku;
}

function SkuThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
      {imageFailed
        ? <Boxes className="h-4 w-4" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />}
    </span>
  );
}

function UnifiedInventoryContent() {
  const searchParams = useSearchParams();
  const [viewTab, setViewTab] = useState<ViewTab>(searchParams.get('tab') === 'risk' ? 'RISK' : 'ALL');
  const [affiliate, setAffiliate] = useState<AffiliateFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [riskStatus, setRiskStatus] = useState<'ALL' | SkuRiskStatus>('ALL');
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SkuListItem | null>(null);
  const [syncing, setSyncing] = useState(false);

  const categories = useMemo(() => {
    const source = affiliate === 'ALL'
      ? INVENTORY_PRODUCTS
      : INVENTORY_PRODUCTS.filter((product) => product.affiliate === affiliate);
    return [...new Set(source.map((product) => product.category))].sort();
  }, [affiliate]);

  const filteredSkus = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return INVENTORY_PRODUCTS.flatMap((product) => product.skus.map((sku) => ({ product, sku })))
      .filter(({ product, sku }) => {
        const effectiveRiskStatus = getEffectiveSkuRiskStatus(sku);
        if (affiliate !== 'ALL' && product.affiliate !== affiliate) return false;
        if (category !== 'ALL' && product.category !== category) return false;
        if (viewTab === 'RISK' && !['WARNING', 'CRITICAL'].includes(effectiveRiskStatus)) return false;
        if (riskStatus !== 'ALL' && effectiveRiskStatus !== riskStatus) return false;

        if (!normalizedQuery) return true;
        const searchTarget = [
          product.name,
          product.productCode,
          product.affiliate,
          product.category,
          product.brand,
          sku.code,
          sku.optionLabel,
          ...Object.values(sku.options),
        ].join(' ').toLowerCase();
        return searchTarget.includes(normalizedQuery);
      }).sort((left, right) => {
        const affiliateOrder = ALL_AFFILIATES.indexOf(left.product.affiliate) - ALL_AFFILIATES.indexOf(right.product.affiliate);
        const productOrder = left.product.name.localeCompare(right.product.name, 'ko');
        return affiliateOrder || productOrder || right.sku.riskScore - left.sku.riskScore;
      });
  }, [affiliate, category, query, riskStatus, viewTab]);

  const affiliateSummary = useMemo(() => {
    return ALL_AFFILIATES.map((company) => {
      const products = INVENTORY_PRODUCTS.filter((product) => product.affiliate === company);
      const skus = products.flatMap((product) => product.skus);
      return {
        company,
        products: products.length,
        skus: skus.length,
        stock: skus.reduce((sum, sku) => sum + sku.stock, 0),
        available: skus.reduce((sum, sku) => sum + sku.availableStock, 0),
        risks: skus.filter((sku) => ['WARNING', 'CRITICAL'].includes(getEffectiveSkuRiskStatus(sku))).length,
      };
    });
  }, []);

  const inventoryOverview = useMemo(() => {
    const all = affiliateSummary.reduce((total, item) => ({
      products: total.products + item.products,
      skus: total.skus + item.skus,
      stock: total.stock + item.stock,
      available: total.available + item.available,
      risks: total.risks + item.risks,
    }), { products: 0, skus: 0, stock: 0, available: 0, risks: 0 });

    return [
      {
        key: 'ALL' as AffiliateFilter,
        label: '전체 계열사',
        shortName: 'ALL AFFILIATES',
        accent: 'text-[#0F4C3A]',
        soft: 'bg-[#F0F7F4]',
        ...all,
      },
      ...affiliateSummary.map((item) => {
        const meta = AFFILIATE_META[item.company];
        return {
          key: item.company as AffiliateFilter,
          label: item.company,
          shortName: meta.shortName,
          accent: meta.accent,
          soft: meta.soft,
          products: item.products,
          skus: item.skus,
          stock: item.stock,
          available: item.available,
          risks: item.risks,
        };
      }),
    ];
  }, [affiliateSummary]);

  const resetFilters = () => {
    setAffiliate('ALL');
    setCategory('ALL');
    setRiskStatus('ALL');
    setQuery('');
  };

  const runMockSync = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 850);
  };

  return (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F7F4] text-[#0F4C3A]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">그룹 통합재고 관제</h1>
              <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
                현대그린푸드·현대웰니스·현대리바트의 상품과 옵션별 SKU 재고를 하나의 기준으로 조회합니다.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500">
              최근 동기화 <strong className="ml-1 text-slate-900">2026.08.02 09:00</strong>
            </div>
            <button
              type="button"
              onClick={runMockSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '동기화 중' : '데이터 동기화'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {inventoryOverview.map((item) => {
            const isActive = affiliate === item.key;
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => {
                  setAffiliate(item.key);
                  setCategory('ALL');
                }}
                className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${isActive ? 'border-[#0F4C3A] bg-[#F0F7F4] ring-2 ring-[#0F4C3A]/10' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.soft} ${item.accent}`}>{item.key === 'ALL' ? <Database className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{item.label}</p>
                      <p className={`mt-0.5 text-[9px] font-bold tracking-wider ${item.accent}`}>{item.shortName}</p>
                    </div>
                  </div>
                  {isActive && <span className="rounded-full bg-[#0F4C3A] px-2 py-1 text-[9px] font-bold text-white">선택됨</span>}
                </div>
                <div className="mt-4 grid grid-cols-4 divide-x divide-slate-100 rounded-xl bg-slate-50/80 py-2.5 text-center">
                  <div><p className="text-[9px] font-semibold text-slate-400">전체 재고</p><p className="mt-1 text-sm font-bold tabular-nums text-slate-950">{item.stock.toLocaleString()}</p></div>
                  <div><p className="text-[9px] font-semibold text-slate-400">판매 가능</p><p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">{item.available.toLocaleString()}</p></div>
                  <div><p className="text-[9px] font-semibold text-slate-400">위험 SKU</p><p className={`mt-1 text-sm font-bold tabular-nums ${item.risks > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{item.risks}</p></div>
                  <div><p className="text-[9px] font-semibold text-slate-400">상품 / SKU</p><p className="mt-1 text-sm font-bold tabular-nums text-slate-700">{item.products} / {item.skus}</p></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewTab('ALL')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${viewTab === 'ALL' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              전체 SKU
            </button>
            <button
              type="button"
              onClick={() => setViewTab('RISK')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${viewTab === 'RISK' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-700'}`}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> 위험 SKU
            </button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative min-w-[240px] flex-1 xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="상품명, 상품코드, SKU 코드 검색"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none transition focus:border-[#0F4C3A] focus:ring-2 focus:ring-[#0F4C3A]/10"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <label className="relative shrink-0">
              <span className="sr-only">계열사 선택</span>
              <select
                value={affiliate}
                onChange={(event) => {
                  setAffiliate(event.target.value as AffiliateFilter);
                  setCategory('ALL');
                }}
                className="h-10 appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 계열사</option>
                {ALL_AFFILIATES.map((company) => <option key={company} value={company}>{company}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
            <label className="relative w-[190px] shrink-0">
              <span className="sr-only">카테고리 선택</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full appearance-none truncate rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 카테고리</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
            <label className="relative shrink-0">
              <span className="sr-only">위험등급 선택</span>
              <select
                value={riskStatus}
                onChange={(event) => setRiskStatus(event.target.value as 'ALL' | SkuRiskStatus)}
                className="h-10 appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 위험등급</option>
                <option value="CRITICAL">위험</option>
                <option value="WARNING">주의</option>
                <option value="CAUTION">보통</option>
                <option value="SAFE">양호</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
            <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100">
              <SlidersHorizontal className="h-3.5 w-3.5" /> 초기화
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs">
          <p className="text-slate-500">
            검색 결과 <strong className="text-slate-900">{filteredSkus.length}개 SKU</strong> · SKU를 선택하면 운영 정보와 LOT 재고를 바로 확인할 수 있습니다.
          </p>
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:flex">
            <Clock3 className="h-3.5 w-3.5" /> 계열사별 마지막 정상 동기화 기준
          </p>
        </div>

        {filteredSkus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-xs">
              <thead className="bg-white text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">계열사</th>
                  <th className="px-4 py-3">상품</th>
                  <th className="px-4 py-3">SKU 코드 / 옵션</th>
                  <th className="px-4 py-3 text-right">판매가</th>
                  <th className="px-4 py-3 text-right">현재고</th>
                  <th className="px-4 py-3 text-right">판매 가능</th>
                  <th className="px-4 py-3 text-right">출고 예정</th>
                  <th className="px-4 py-3">SKU 위험도</th>
                  <th className="px-4 py-3 text-right">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkus.map(({ product, sku }) => {
                  const meta = AFFILIATE_META[product.affiliate];
                  const risk = RISK_META[getEffectiveSkuRiskStatus(sku)];
                  return (
                    <tr
                      key={sku.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedItem({ product, sku })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedItem({ product, sku });
                      }}
                      className="group cursor-pointer border-b border-slate-100 outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60"
                    >
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold ${meta.soft} ${meta.accent} ${meta.border}`}>{product.affiliate}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-semibold text-slate-600 group-hover:text-[#0F4C3A]">{product.name}</p>
                        <p className="mt-1 text-[10px] text-slate-400"><span className="font-mono">{product.productCode}</span> · {product.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <SkuThumbnail src={SKU_OPERATION_DATA[sku.id]?.imageUrl ?? product.imageUrl} alt={`${sku.optionLabel} 상품 이미지`} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-extrabold text-slate-950">{sku.optionLabel}</p>
                            <p className="mt-1 font-mono text-[10px] text-slate-400">{sku.code}</p>
                            <div className="mt-1.5 flex max-w-[300px] flex-nowrap gap-1 overflow-hidden">
                              {Object.entries(sku.options).slice(0, 3).map(([key, value]) => <span key={key} className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{key} {value}</span>)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">₩{sku.sellingPrice.toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{sku.stock.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{sku.availableStock.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-500">{sku.reservedStock.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3">
                        <span className="group/skurisk relative inline-flex">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${risk.className}`}>{risk.label}</span>
                          <span role="tooltip" className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 w-64 rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-medium leading-4 text-white opacity-0 shadow-xl transition group-hover/skurisk:visible group-hover/skurisk:opacity-100">
                            SKU 자체 판매부진 위험과 LOT별 위험도 중 가장 높은 등급을 반영합니다.
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-[#0F4C3A]">상세 보기 <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></div>
            <p className="mt-4 font-bold text-slate-800">조건에 맞는 SKU가 없습니다</p>
            <p className="mt-1 text-xs text-slate-500">검색어 또는 필터 조건을 변경해 주세요.</p>
            <button type="button" onClick={resetFilters} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white">필터 초기화 <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </section>

      <InventoryProductDetail product={selectedItem?.product ?? null} initialSkuId={selectedItem?.sku.id} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

export default function UnifiedInventoryPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">통합재고 데이터를 불러오는 중입니다...</div>}>
        <UnifiedInventoryContent />
      </Suspense>
    </AppLayout>
  );
}
