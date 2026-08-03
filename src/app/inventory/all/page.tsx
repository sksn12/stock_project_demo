'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Package,
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
  RISK_META,
  SkuRiskStatus,
} from '@/lib/inventory-control-data';

type AffiliateFilter = 'ALL' | InventoryAffiliate;
type ViewTab = 'ALL' | 'RISK';

const riskOrder: Record<SkuRiskStatus, number> = {
  SAFE: 0,
  CAUTION: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function productMetrics(product: InventoryProduct) {
  const totalStock = product.skus.reduce((sum, sku) => sum + sku.stock, 0);
  const availableStock = product.skus.reduce((sum, sku) => sum + sku.availableStock, 0);
  const riskSkus = product.skus.filter((sku) => ['WARNING', 'CRITICAL'].includes(sku.riskStatus));
  const highestRiskSku = [...product.skus].sort((a, b) => b.riskScore - a.riskScore)[0];
  return { totalStock, availableStock, riskSkus, highestRiskSku };
}

function productOptionSummary(product: InventoryProduct) {
  const optionKeys = [...new Set(product.skus.flatMap((sku) => Object.keys(sku.options)))];

  return optionKeys.slice(0, 2).map((key) => {
    const values = [...new Set(product.skus.map((sku) => sku.options[key]).filter(Boolean))];
    const visibleValues = values.slice(0, 2).join('·');
    const remainingCount = Math.max(0, values.length - 2);
    return `${key} ${visibleValues}${remainingCount > 0 ? ` 외 ${remainingCount}종` : ''}`;
  }).join(' / ');
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: 'default' | 'risk' | 'success';
}) {
  const toneStyle = tone === 'risk'
    ? 'text-rose-700'
    : tone === 'success'
      ? 'text-emerald-700'
      : 'text-slate-950';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span>{label}</span>
        {icon}
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${toneStyle}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{helper}</p>
    </div>
  );
}

function UnifiedInventoryContent() {
  const searchParams = useSearchParams();
  const [viewTab, setViewTab] = useState<ViewTab>(searchParams.get('tab') === 'risk' ? 'RISK' : 'ALL');
  const [affiliate, setAffiliate] = useState<AffiliateFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [riskStatus, setRiskStatus] = useState<'ALL' | SkuRiskStatus>('ALL');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [syncing, setSyncing] = useState(false);

  const categories = useMemo(() => {
    const source = affiliate === 'ALL'
      ? INVENTORY_PRODUCTS
      : INVENTORY_PRODUCTS.filter((product) => product.affiliate === affiliate);
    return [...new Set(source.map((product) => product.category))].sort();
  }, [affiliate]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return INVENTORY_PRODUCTS.filter((product) => {
      if (affiliate !== 'ALL' && product.affiliate !== affiliate) return false;
      if (category !== 'ALL' && product.category !== category) return false;
      if (viewTab === 'RISK' && !product.skus.some((sku) => ['WARNING', 'CRITICAL'].includes(sku.riskStatus))) return false;
      if (riskStatus !== 'ALL' && !product.skus.some((sku) => sku.riskStatus === riskStatus)) return false;

      if (!normalizedQuery) return true;
      const searchTarget = [
        product.name,
        product.productCode,
        product.affiliate,
        product.category,
        product.brand,
        ...product.skus.flatMap((sku) => [sku.code, sku.optionLabel, ...Object.values(sku.options)]),
      ].join(' ').toLowerCase();
      return searchTarget.includes(normalizedQuery);
    });
  }, [affiliate, category, query, riskStatus, viewTab]);

  const summary = useMemo(() => {
    const skus = filteredProducts.flatMap((product) => product.skus);
    return {
      products: filteredProducts.length,
      skus: skus.length,
      stock: skus.reduce((sum, sku) => sum + sku.stock, 0),
      available: skus.reduce((sum, sku) => sum + sku.availableStock, 0),
      risks: skus.filter((sku) => ['WARNING', 'CRITICAL'].includes(sku.riskStatus)).length,
    };
  }, [filteredProducts]);

  const affiliateSummary = useMemo(() => {
    return ALL_AFFILIATES.map((company) => {
      const products = INVENTORY_PRODUCTS.filter((product) => product.affiliate === company);
      const skus = products.flatMap((product) => product.skus);
      return {
        company,
        products: products.length,
        skus: skus.length,
        stock: skus.reduce((sum, sku) => sum + sku.stock, 0),
        risks: skus.filter((sku) => ['WARNING', 'CRITICAL'].includes(sku.riskStatus)).length,
      };
    });
  }, []);

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
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Database className="h-4 w-4" />
              Hyundai Group Unified Inventory
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">그룹 통합재고 관제</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              현대그린푸드·현대웰니스·현대리바트의 상품을 공통 상품 구조로 통합하고, 실제 재고는 옵션별 SKU 단위로 추적합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-300">
              최근 통합 동기화 <strong className="ml-1 text-white">2026.08.02 09:00</strong>
            </div>
            <button
              type="button"
              onClick={runMockSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-100 disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '동기화 중' : '데이터 동기화'}
            </button>
          </div>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3">
          {affiliateSummary.map((item) => {
            const meta = AFFILIATE_META[item.company];
            const isActive = affiliate === item.company;
            return (
              <button
                type="button"
                key={item.company}
                onClick={() => {
                  setAffiliate(isActive ? 'ALL' : item.company);
                  setCategory('ALL');
                }}
                className={`group border-white/10 p-4 text-left transition hover:bg-white/10 sm:border-r sm:last:border-r-0 ${isActive ? 'bg-white/15' : 'bg-white/[0.03]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{item.company}</p>
                    <p className="mt-0.5 text-[10px] font-semibold tracking-widest text-slate-400">{meta.shortName}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.risks > 0 ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                    위험 SKU {item.risks}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xs text-slate-400">상품 {item.products} · SKU {item.skus}</p>
                  <p className="text-lg font-bold tabular-nums text-white">{item.stock.toLocaleString()}<span className="ml-1 text-xs font-medium text-slate-400">재고</span></p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="통합 상품" value={`${summary.products}개`} helper="상품 마스터 기준" icon={<Package className="h-4 w-4 text-[#0F4C3A]" />} />
        <MetricCard label="관리 SKU" value={`${summary.skus}개`} helper="옵션·용량·구성별" icon={<Boxes className="h-4 w-4 text-[#0F4C3A]" />} />
        <MetricCard label="전체 재고" value={`${summary.stock.toLocaleString()}개`} helper="선택 조건 합계" icon={<Building2 className="h-4 w-4 text-[#0F4C3A]" />} />
        <MetricCard label="판매 가능" value={`${summary.available.toLocaleString()}개`} helper="예약·보류 제외" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} tone="success" />
        <div className="col-span-2 lg:col-span-1">
          <MetricCard label="위험 SKU" value={`${summary.risks}개`} helper="위험·긴급 등급" icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} tone="risk" />
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
              전체 상품
            </button>
            <button
              type="button"
              onClick={() => setViewTab('RISK')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${viewTab === 'RISK' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-700'}`}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> 위험 SKU 보유 상품
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
            <label className="relative">
              <span className="sr-only">계열사 선택</span>
              <select
                value={affiliate}
                onChange={(event) => {
                  setAffiliate(event.target.value as AffiliateFilter);
                  setCategory('ALL');
                }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 계열사</option>
                {ALL_AFFILIATES.map((company) => <option key={company} value={company}>{company}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">카테고리 선택</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 max-w-[190px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 카테고리</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">위험등급 선택</span>
              <select
                value={riskStatus}
                onChange={(event) => setRiskStatus(event.target.value as 'ALL' | SkuRiskStatus)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 위험등급</option>
                <option value="CRITICAL">긴급</option>
                <option value="WARNING">위험</option>
                <option value="CAUTION">주의</option>
                <option value="SAFE">정상</option>
              </select>
            </label>
            <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100">
              <SlidersHorizontal className="h-3.5 w-3.5" /> 초기화
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs">
          <p className="text-slate-500">
            검색 결과 <strong className="text-slate-900">{filteredProducts.length}개 상품</strong> · 상품을 선택하면 이미지와 하위 SKU를 확인할 수 있습니다.
          </p>
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:flex">
            <Clock3 className="h-3.5 w-3.5" /> 계열사별 마지막 정상 동기화 기준
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="bg-white text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">계열사</th>
                  <th className="px-4 py-3">상품</th>
                  <th className="px-4 py-3">카테고리</th>
                  <th className="px-4 py-3">SKU 구성</th>
                  <th className="px-4 py-3 text-right">전체 재고</th>
                  <th className="px-4 py-3 text-right">판매 가능</th>
                  <th className="px-4 py-3">최고 위험도</th>
                  <th className="px-4 py-3 text-right">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const meta = AFFILIATE_META[product.affiliate];
                  const metrics = productMetrics(product);
                  const risk = RISK_META[metrics.highestRiskSku.riskStatus];
                  return (
                    <tr
                      key={product.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedProduct(product)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(product);
                      }}
                      className="group cursor-pointer outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60"
                    >
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold ${meta.soft} ${meta.accent} ${meta.border}`}>{product.affiliate}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900 group-hover:text-[#0F4C3A]">{product.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{product.productCode} · {product.brand}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{product.category}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Boxes className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="max-w-[220px] text-[10px] font-semibold leading-4 text-slate-700">{productOptionSummary(product)}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{product.skus.length}개 SKU · 위험 {metrics.riskSkus.length}개 포함</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-bold tabular-nums text-slate-900">{metrics.totalStock.toLocaleString()}개</td>
                      <td className="px-4 py-4 text-right font-bold tabular-nums text-emerald-700">{metrics.availableStock.toLocaleString()}개</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${risk.className}`}>{risk.label} · {metrics.highestRiskSku.riskScore}점</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-[#0F4C3A]">SKU 보기 <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
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
            <p className="mt-4 font-bold text-slate-800">조건에 맞는 상품이 없습니다</p>
            <p className="mt-1 text-xs text-slate-500">검색어 또는 필터 조건을 변경해 주세요.</p>
            <button type="button" onClick={resetFilters} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white">필터 초기화 <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </section>

      <InventoryProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />
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
