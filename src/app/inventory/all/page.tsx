'use client';

import { Suspense, useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  Clock3,
  Database,
  Globe2,
  Info,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { InventoryProductDetail } from '@/components/inventory/inventory-product-detail';
import {
  INVENTORY_PRODUCTS,
  InventoryProduct,
  InventorySku,
  RISK_META,
  SkuRiskStatus,
  SKU_OPERATION_DATA,
} from '@/lib/inventory-control-data';
import {
  CHANNEL_TYPE_META,
  ChannelInventory,
  GREENFOOD_CHANNEL_INVENTORY,
  getChannelInventoryBySku,
  getChannelRiskStatus,
} from '@/lib/greenfood-channel-data';

type ScopeFilter = 'ALL' | 'ONLINE' | 'OFFLINE';

interface InventoryListItem {
  product: InventoryProduct;
  sku: InventorySku;
  channel: ChannelInventory;
}

const GREENFOOD_PRODUCTS = INVENTORY_PRODUCTS.filter((product) => product.affiliate === '현대그린푸드');

function SkuThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
      {imageFailed
        ? <Boxes className="h-4 w-4" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />}
    </span>
  );
}

function scopeIcon(scope: ScopeFilter | 'CENTER') {
  if (scope === 'ONLINE') return <Globe2 className="h-4 w-4" />;
  if (scope === 'OFFLINE') return <Store className="h-4 w-4" />;
  return <Database className="h-4 w-4" />;
}

function UnifiedInventoryContent() {
  const [scope, setScope] = useState<ScopeFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [region, setRegion] = useState('ALL');
  const [salesPoint, setSalesPoint] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | SkuRiskStatus>('ALL');
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryListItem | null>(null);
  const [syncing, setSyncing] = useState(false);

  const categories = useMemo(() => [...new Set(GREENFOOD_PRODUCTS.map((product) => product.category))].sort(), []);
  const salesInventory = useMemo(() => GREENFOOD_CHANNEL_INVENTORY.filter((item) => item.channelType !== 'CENTER'), []);
  const regions = useMemo(() => [...new Set(salesInventory.map((item) => item.region).filter((item) => item !== '전국'))].sort(), [salesInventory]);
  const salesPoints = useMemo(() => [...new Set(salesInventory.filter((item) => scope === 'ALL' || item.channelType === scope).map((item) => item.channelName))].sort(), [salesInventory, scope]);
  const skuPairs = useMemo(() => GREENFOOD_PRODUCTS.flatMap((product) => product.skus.map((sku) => ({ product, sku }))), []);

  const listItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base: InventoryListItem[] = skuPairs.flatMap(({ product, sku }) => getChannelInventoryBySku(sku.id)
      .filter((row) => row.channelType !== 'CENTER' && (scope === 'ALL' || row.channelType === scope))
      .map((channel) => ({ product, sku, channel })));

    return base.filter(({ product, sku, channel }) => {
      if (category !== 'ALL' && product.category !== category) return false;
      if (region !== 'ALL' && channel.region !== region) return false;
      if (salesPoint !== 'ALL' && channel.channelName !== salesPoint) return false;
      if (riskFilter !== 'ALL' && getChannelRiskStatus(channel, sku) !== riskFilter) return false;
      if (!normalizedQuery) return true;
      return [
        product.name,
        product.productCode,
        product.category,
        sku.code,
        sku.optionLabel,
        ...Object.values(sku.options),
        channel.channelName,
      ].join(' ').toLowerCase().includes(normalizedQuery);
    }).sort((left, right) => {
      const rank: Record<SkuRiskStatus, number> = { CRITICAL: 4, WARNING: 3, CAUTION: 2, SAFE: 1 };
      return rank[getChannelRiskStatus(right.channel, right.sku)] - rank[getChannelRiskStatus(left.channel, left.sku)]
        || right.channel.stock - left.channel.stock;
    });
  }, [category, query, region, riskFilter, salesPoint, scope, skuPairs]);

  const scopeCards = useMemo(() => {
    const scopes: ScopeFilter[] = ['ALL', 'ONLINE', 'OFFLINE'];
    return scopes.map((item) => {
      const rows = item === 'ALL' ? salesInventory : salesInventory.filter((row) => row.channelType === item);
      return {
        key: item,
        label: item === 'ALL' ? '전체 판매처' : CHANNEL_TYPE_META[item].label,
        description: item === 'ALL' ? '온라인·오프라인 통합' : CHANNEL_TYPE_META[item].description,
        stock: rows.reduce((sum, row) => sum + row.stock, 0),
        available: rows.reduce((sum, row) => sum + row.availableStock, 0),
        shortages: rows.filter((row) => row.health === 'SHORTAGE').length,
        surpluses: rows.filter((row) => row.health === 'SURPLUS').length,
      };
    });
  }, [salesInventory]);

  const resetFilters = () => {
    setScope('ALL');
    setCategory('ALL');
    setRegion('ALL');
    setSalesPoint('ALL');
    setRiskFilter('ALL');
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F7F4] text-[#0F4C3A]"><Database className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">현대그린푸드 채널 통합재고</h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">R1 냉동 완제품</span>
              </div>
              <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">온라인·오프라인 판매처별 운영재고를 확인하고, 동일 SKU의 재고 불균형을 비교합니다.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500">최근 통합 동기화 <strong className="ml-1 text-slate-900">2026.08.06 05:00</strong></div>
            <button type="button" onClick={runMockSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:opacity-70"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? '동기화 중' : '데이터 동기화'}</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {scopeCards.map((item) => {
            const isActive = scope === item.key;
            return (
              <button type="button" key={item.key} onClick={() => { setScope(item.key); setSalesPoint('ALL'); }} className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isActive ? 'border-[#0F4C3A] bg-[#F0F7F4] ring-2 ring-[#0F4C3A]/10' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-[#0F4C3A] text-white' : 'bg-slate-100 text-slate-500'}`}>{scopeIcon(item.key)}</span><div><p className="text-sm font-bold text-slate-950">{item.label}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.description}</p></div></div>
                  {isActive && <span className="rounded-full bg-[#0F4C3A] px-2 py-1 text-[9px] font-bold text-white">선택됨</span>}
                </div>
                <div className="mt-4 grid grid-cols-4 divide-x divide-slate-200/70 rounded-xl bg-white/70 py-2.5 text-center">
                  <div><p className="text-[9px] text-slate-400">현재고</p><p className="mt-1 text-sm font-bold tabular-nums text-slate-950">{item.stock.toLocaleString()}</p></div>
                  <div><p className="text-[9px] text-slate-400">판매 가능</p><p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">{item.available.toLocaleString()}</p></div>
                  <div><p className="text-[9px] text-slate-400">부족</p><p className="mt-1 text-sm font-bold tabular-nums text-amber-700">{item.shortages}</p></div>
                  <div><p className="text-[9px] text-slate-400">과잉</p><p className="mt-1 text-sm font-bold tabular-nums text-rose-600">{item.surpluses}</p></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="shrink-0">
            <p className="text-sm font-extrabold text-slate-900">판매처별 운영재고</p>
            <p className="mt-1 text-[10px] text-slate-500">판매처와 SKU별 위험재고 등급을 확인합니다.</p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative min-w-[240px] flex-1 xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명, SKU 코드, 판매처 검색" className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none transition focus:border-[#0F4C3A] focus:ring-2 focus:ring-[#0F4C3A]/10" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <FilterSelect label="지역" value={region} onChange={setRegion} options={regions} allLabel="전체 지역" />
            <FilterSelect label="판매처" value={salesPoint} onChange={setSalesPoint} options={salesPoints} allLabel="전체 판매처" width="w-[210px]" />
            <FilterSelect label="카테고리" value={category} onChange={setCategory} options={categories} allLabel="전체 카테고리" width="w-[190px]" />
            <label className="relative shrink-0"><span className="sr-only">위험재고 등급 선택</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'ALL' | SkuRiskStatus)} className="h-10 appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"><option value="ALL">전체 위험등급</option><option value="CRITICAL">위험</option><option value="WARNING">주의</option><option value="CAUTION">보통</option><option value="SAFE">양호</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>
            <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"><SlidersHorizontal className="h-3.5 w-3.5" />초기화</button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs"><p className="text-slate-500">검색 결과 <strong className="text-slate-900">{listItems.length}건</strong> · 판매처별 운영재고를 조회합니다.</p><p className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:flex"><Clock3 className="h-3.5 w-3.5" />판매처별 마지막 정상 동기화 기준</p></div>

        {listItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-xs">
              <thead className="bg-white text-[11px] font-bold text-slate-400"><tr><th className="px-5 py-3">판매처</th><th className="px-4 py-3">상품</th><th className="px-4 py-3">SKU 코드·옵션</th><th className="px-4 py-3 text-right">판매가</th><th className="px-4 py-3 text-right">현재고</th><th className="px-4 py-3 text-right">판매 가능</th><th className="px-4 py-3 text-right">출고 예정</th><th className="px-4 py-3">위험재고 등급</th><th className="px-5 py-3 text-right">상세</th></tr></thead>
              <tbody>
                {listItems.map(({ product, sku, channel }) => {
                  const risk = RISK_META[getChannelRiskStatus(channel, sku)];
                  const rowKey = `${sku.id}-${channel.id}`;
                  return (
                    <tr key={rowKey} tabIndex={0} role="button" onClick={() => setSelectedItem({ product, sku, channel })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedItem({ product, sku, channel }); }} className="group cursor-pointer border-b border-slate-100 outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60">
                      <td className="px-5 py-3.5"><div><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${CHANNEL_TYPE_META[channel.channelType].className}`}>{scopeIcon(channel.channelType)}{CHANNEL_TYPE_META[channel.channelType].label}</span></div><p className="mt-1.5 max-w-[190px] font-bold text-slate-800">{channel.channelName}</p><p className="mt-1 text-[10px] text-slate-400">{channel.region} · {channel.fulfillmentCenter}</p></div></td>
                      <td className="px-4 py-3.5"><p className="font-bold text-slate-800">{product.name}</p><p className="mt-1 text-[10px] text-slate-400">{product.productCode} · {product.category}</p></td>
                      <td className="px-4 py-3.5"><div className="flex items-center gap-3"><SkuThumbnail src={SKU_OPERATION_DATA[sku.id]?.imageUrl ?? product.imageUrl} alt={sku.optionLabel} /><div className="min-w-0"><p className="text-[13px] font-extrabold text-slate-950">{sku.optionLabel}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{sku.code}</p><div className="mt-1.5 flex gap-1">{Object.entries(sku.options).slice(0, 3).map(([key, value]) => <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{key} {value}</span>)}</div></div></div></td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">₩{sku.sellingPrice.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">{channel.stock.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">{channel.availableStock.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-500">{channel.outboundScheduled.toLocaleString()}{sku.unit}</td>
                      <td className="px-4 py-3.5"><StatusWithTooltip label={risk.label} className={risk.className} tooltip="판매처별 판매속도, 14일 예상수요, 안전재고, 재고보유일수와 소비기한을 기준으로 산정한 시연용 위험재고 등급입니다." /></td>
                      <td className="px-5 py-3.5 text-right"><span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C3A]">판매처 상세<ArrowRight className="h-3.5 w-3.5" /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="p-14 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">조건에 맞는 재고가 없습니다.</p><button type="button" onClick={resetFilters} className="mt-3 text-xs font-bold text-[#0F4C3A]">필터 초기화</button></div>}
      </section>

      <InventoryProductDetail product={selectedItem?.product ?? null} initialSkuId={selectedItem?.sku.id} initialChannelId={selectedItem?.channel?.id} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

function StatusWithTooltip({ label, className, tooltip }: { label: string; className: string; tooltip: string }) {
  return <span className="group/status relative inline-flex"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${className}`}>{label}<Info className="h-3 w-3 opacity-60" /></span><span role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2.5 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/status:visible group-hover/status:opacity-100">{tooltip}</span></span>;
}

function FilterSelect({ label, value, onChange, options, allLabel, width = '' }: { label: string; value: string; onChange: (value: string) => void; options: string[]; allLabel: string; width?: string }) {
  return <label className={`relative shrink-0 ${width}`}><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"><option value="ALL">{allLabel}</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>;
}

export default function UnifiedInventoryPage() {
  return <AppLayout><Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">통합재고를 불러오고 있습니다.</div>}><UnifiedInventoryContent /></Suspense></AppLayout>;
}
