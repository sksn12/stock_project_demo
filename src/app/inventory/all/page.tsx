'use client';

import { Suspense, useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Globe2,
  Info,
  Layers3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { InventoryProductDetail } from '@/components/inventory/inventory-product-detail';
import { InventoryBundleModal } from '@/components/inventory/inventory-bundle-modal';
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
  const [categoryLarge, setCategoryLarge] = useState('ALL');
  const [categoryMedium, setCategoryMedium] = useState('ALL');
  const [categorySmall, setCategorySmall] = useState('ALL');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [region, setRegion] = useState('ALL');
  const [salesPoint, setSalesPoint] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | SkuRiskStatus>('ALL');
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryListItem | null>(null);
  const [selectedBundleItems, setSelectedBundleItems] = useState<InventoryListItem[]>([]);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [savedBundleCode, setSavedBundleCode] = useState('');
  const [syncing, setSyncing] = useState(false);

  const salesInventory = useMemo(() => GREENFOOD_CHANNEL_INVENTORY.filter((item) => item.channelType !== 'CENTER'), []);
  const regions = useMemo(() => [...new Set(salesInventory.map((item) => item.region).filter((item) => item !== '전국'))].sort(), [salesInventory]);
  const salesPoints = useMemo(() => [...new Set(salesInventory.filter((item) => scope === 'ALL' || item.channelType === scope).map((item) => item.channelName))].sort(), [salesInventory, scope]);
  const skuPairs = useMemo(() => GREENFOOD_PRODUCTS.flatMap((product) => product.skus.map((sku) => ({ product, sku }))), []);
  const categoryRows = useMemo(() => skuPairs.map(({ product, sku }) => {
    const [large = '기타', medium = '기타'] = product.category.split('/');
    const small = sku.optionLabel.split('·')[0].trim();
    return { large, medium, small };
  }), [skuPairs]);
  const largeCategories = useMemo(() => [...new Set(categoryRows.map((row) => row.large))].sort(), [categoryRows]);
  const mediumCategories = useMemo(() => [...new Set(categoryRows.filter((row) => categoryLarge === 'ALL' || row.large === categoryLarge).map((row) => row.medium))].sort(), [categoryLarge, categoryRows]);
  const smallCategories = useMemo(() => [...new Set(categoryRows.filter((row) => (categoryLarge === 'ALL' || row.large === categoryLarge) && (categoryMedium === 'ALL' || row.medium === categoryMedium)).map((row) => row.small))].sort(), [categoryLarge, categoryMedium, categoryRows]);

  const listItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base: InventoryListItem[] = skuPairs.flatMap(({ product, sku }) => getChannelInventoryBySku(sku.id)
      .filter((row) => row.channelType !== 'CENTER' && (scope === 'ALL' || row.channelType === scope))
      .map((channel) => ({ product, sku, channel })));

    return base.filter(({ product, sku, channel }) => {
      const [large = '기타', medium = '기타'] = product.category.split('/');
      const small = sku.optionLabel.split('·')[0].trim();
      if (categoryLarge !== 'ALL' && large !== categoryLarge) return false;
      if (categoryMedium !== 'ALL' && medium !== categoryMedium) return false;
      if (categorySmall !== 'ALL' && small !== categorySmall) return false;
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
  }, [categoryLarge, categoryMedium, categorySmall, query, region, riskFilter, salesPoint, scope, skuPairs]);

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
    setCategoryLarge('ALL');
    setCategoryMedium('ALL');
    setCategorySmall('ALL');
    setCategoryPickerOpen(false);
    setRegion('ALL');
    setSalesPoint('ALL');
    setRiskFilter('ALL');
    setQuery('');
  };

  const runMockSync = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 850);
  };

  const getRowKey = (item: InventoryListItem) => `${item.sku.id}-${item.channel.id}`;
  const isBundleSelected = (item: InventoryListItem) => selectedBundleItems.some((selected) => getRowKey(selected) === getRowKey(item));
  const hasSameSkuSelected = (item: InventoryListItem) => selectedBundleItems.some((selected) => selected.sku.id === item.sku.id && getRowKey(selected) !== getRowKey(item));

  const toggleBundleItem = (item: InventoryListItem) => {
    const selected = isBundleSelected(item);
    if (selected) {
      setSelectedBundleItems((current) => current.filter((selectedItem) => getRowKey(selectedItem) !== getRowKey(item)));
      setSavedBundleCode('');
      return;
    }
    if (selectedBundleItems.length >= 5 || hasSameSkuSelected(item) || item.channel.availableStock <= 0) return;
    setSelectedBundleItems((current) => [...current, item]);
    setSavedBundleCode('');
  };

  return (
    <div className="inventory-accessible space-y-5 pb-10">
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
            <button type="button" onClick={() => setCategoryPickerOpen(true)} className={`inline-flex h-10 min-w-[220px] max-w-[300px] items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left text-xs font-bold transition ${categoryLarge === 'ALL' ? 'border-slate-300 text-slate-700 hover:border-[#0F4C3A]' : 'border-emerald-300 text-[#0F4C3A] ring-1 ring-emerald-100'}`}><span className="truncate">{categoryLarge === 'ALL' ? '전체 카테고리' : [categoryLarge, categoryMedium !== 'ALL' ? categoryMedium : null, categorySmall !== 'ALL' ? categorySmall : null].filter(Boolean).join(' › ')}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /></button>
            <label className="relative shrink-0"><span className="sr-only">위험재고 등급 선택</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'ALL' | SkuRiskStatus)} className="h-10 appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"><option value="ALL">전체 위험등급</option><option value="CRITICAL">위험</option><option value="WARNING">주의</option><option value="CAUTION">보통</option><option value="SAFE">양호</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>
            <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"><SlidersHorizontal className="h-3.5 w-3.5" />초기화</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-xs"><div className="flex flex-wrap items-center gap-2"><p className="whitespace-nowrap text-slate-500">검색 결과 <strong className="text-slate-900">{listItems.length}건</strong> · 판매처별 운영재고를 조회합니다.</p>{categoryLarge !== 'ALL' && <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><span>{categoryLarge}</span>{categoryMedium !== 'ALL' && <><span className="text-emerald-500">›</span><span>{categoryMedium}</span></>}{categorySmall !== 'ALL' && <><span className="text-emerald-500">›</span><span>{categorySmall}</span></>}</div>}</div><p className="hidden items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-400 md:flex"><Clock3 className="h-3.5 w-3.5" />판매처별 마지막 정상 동기화 기준</p></div>

        {selectedBundleItems.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F4C3A] text-white"><Layers3 className="h-4 w-4" /></span>
              <div><p className="text-xs font-black text-slate-950">{selectedBundleItems.length}개 SKU 선택됨 <span className="font-medium text-slate-500">· 최대 5개</span></p><p className="mt-0.5 text-[10px] text-slate-500">판매 가능 재고 합계 {selectedBundleItems.reduce((sum, item) => sum + item.channel.availableStock, 0).toLocaleString()}개{selectedBundleItems.length < 2 ? ' · 번들 구성을 위해 1개 이상 더 선택하세요.' : ''}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {savedBundleCode && <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-700">저장 완료 {savedBundleCode}</span>}
              <button type="button" onClick={() => { setSelectedBundleItems([]); setSavedBundleCode(''); }} className="rounded-xl px-3 py-2 text-[10px] font-bold text-slate-500 hover:bg-white">선택 해제</button>
              <button type="button" onClick={() => setBundleOpen(true)} disabled={selectedBundleItems.length < 2} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Layers3 className="h-4 w-4" />번들 구성</button>
            </div>
          </div>
        )}

        {listItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] text-left text-xs">
              <thead className="whitespace-nowrap bg-slate-50 text-[11px] font-extrabold text-slate-600"><tr><th className="w-14 px-5 py-3 text-center">선택</th><th className="px-4 py-3">판매처</th><th className="px-4 py-3">상품</th><th className="px-4 py-3">SKU 코드·옵션</th><th className="px-4 py-3 text-right">현재고</th><th className="px-4 py-3 text-right">판매 가능</th><th className="px-4 py-3 text-right">출고 예정</th><th className="px-4 py-3">위험재고 등급</th><th className="px-5 py-3 text-right">상세</th></tr></thead>
              <tbody>
                {listItems.map(({ product, sku, channel }) => {
                  const risk = RISK_META[getChannelRiskStatus(channel, sku)];
                  const rowKey = `${sku.id}-${channel.id}`;
                  const item = { product, sku, channel };
                  const bundleSelected = isBundleSelected(item);
                  const bundleDisabled = !bundleSelected && (selectedBundleItems.length >= 5 || hasSameSkuSelected(item) || channel.availableStock <= 0);
                  return (
                    <tr key={rowKey} tabIndex={0} role="button" onClick={() => setSelectedItem({ product, sku, channel })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedItem({ product, sku, channel }); }} className={`group cursor-pointer border-b border-slate-100 outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60 ${bundleSelected ? 'bg-emerald-50/70' : ''}`}>
                      <td className="px-5 py-3.5 text-center" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><input type="checkbox" checked={bundleSelected} disabled={bundleDisabled} onChange={() => toggleBundleItem(item)} aria-label={`${sku.optionLabel} ${channel.channelName} 번들 선택`} title={hasSameSkuSelected(item) && !bundleSelected ? '동일 SKU의 다른 판매처 재고가 이미 선택되었습니다.' : selectedBundleItems.length >= 5 && !bundleSelected ? '번들은 최대 5개 SKU까지 선택할 수 있습니다.' : undefined} className="h-4 w-4 cursor-pointer accent-[#0F4C3A] disabled:cursor-not-allowed" /></td>
                      <td className="px-4 py-3.5"><div><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${CHANNEL_TYPE_META[channel.channelType].className}`}>{scopeIcon(channel.channelType)}{CHANNEL_TYPE_META[channel.channelType].label}</span></div><p className="mt-1.5 max-w-[190px] font-bold text-slate-800">{channel.channelName}</p><p className="mt-1 text-[10px] text-slate-400">{channel.region} · {channel.fulfillmentCenter}</p></div></td>
                      <td className="px-4 py-3.5"><p className="font-bold text-slate-800">{product.name}</p><p className="mt-1 text-[10px] text-slate-400">{product.productCode} · {product.category}</p></td>
                      <td className="px-4 py-3.5"><div className="flex items-center gap-3"><SkuThumbnail src={SKU_OPERATION_DATA[sku.id]?.imageUrl ?? product.imageUrl} alt={sku.optionLabel} /><div className="min-w-0"><p className="text-[13px] font-extrabold text-slate-950">{sku.optionLabel}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{sku.code}</p><div className="mt-1.5 flex gap-1">{Object.entries(sku.options).slice(0, 3).map(([key, value]) => <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{key} {value}</span>)}</div></div></div></td>
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
      {bundleOpen && <InventoryBundleModal selectedItems={selectedBundleItems} onClose={() => setBundleOpen(false)} onSaved={(code) => setSavedBundleCode(code)} />}
      {categoryPickerOpen && (
        <CategoryDrilldownModal
          categoryRows={categoryRows}
          largeOptions={largeCategories}
          mediumOptions={mediumCategories}
          smallOptions={smallCategories}
          large={categoryLarge}
          medium={categoryMedium}
          small={categorySmall}
          onLargeChange={(value) => { setCategoryLarge(value); setCategoryMedium('ALL'); setCategorySmall('ALL'); }}
          onMediumChange={(value) => { setCategoryMedium(value); setCategorySmall('ALL'); }}
          onSmallChange={setCategorySmall}
          onReset={() => { setCategoryLarge('ALL'); setCategoryMedium('ALL'); setCategorySmall('ALL'); }}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </div>
  );
}

function StatusWithTooltip({ label, className, tooltip }: { label: string; className: string; tooltip: string }) {
  return <span className="group/status relative inline-flex"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${className}`}>{label}<Info className="h-3 w-3 opacity-60" /></span><span role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2.5 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/status:visible group-hover/status:opacity-100">{tooltip}</span></span>;
}

function FilterSelect({ label, value, onChange, options, allLabel, width = '', disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; allLabel: string; width?: string; disabled?: boolean }) {
  return <label className={`relative shrink-0 ${width}`}><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"><option value="ALL">{allLabel}</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></label>;
}

function CategoryDrilldownModal({ categoryRows, largeOptions, mediumOptions, smallOptions, large, medium, small, onLargeChange, onMediumChange, onSmallChange, onReset, onClose }: {
  categoryRows: Array<{ large: string; medium: string; small: string }>;
  largeOptions: string[];
  mediumOptions: string[];
  smallOptions: string[];
  large: string;
  medium: string;
  small: string;
  onLargeChange: (value: string) => void;
  onMediumChange: (value: string) => void;
  onSmallChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const path = [large !== 'ALL' ? large : null, medium !== 'ALL' ? medium : null, small !== 'ALL' ? small : null].filter(Boolean).join(' › ');
  const countFor = (level: 'large' | 'medium' | 'small', value: string) => categoryRows.filter((row) => {
    if (level === 'large') return row.large === value;
    if (level === 'medium') return row.large === large && row.medium === value;
    return row.large === large && row.medium === medium && row.small === value;
  }).length;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="category-drilldown-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div><p className="text-[10px] font-black text-emerald-700">상품 분류 탐색</p><h2 id="category-drilldown-title" className="mt-1 text-lg font-black text-slate-950">카테고리 드릴다운</h2><p className="mt-1 text-xs text-slate-600">대분류부터 순서대로 내려가며 재고 범위를 좁힙니다.</p></div>
          <button type="button" onClick={onClose} aria-label="카테고리 선택창 닫기" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid min-h-[340px] md:grid-cols-3">
          <CategoryColumn title="1. 대분류" description="사업 상품군" options={largeOptions} selected={large} onSelect={onLargeChange} getCount={(value) => countFor('large', value)} />
          <CategoryColumn title="2. 중분류" description={large === 'ALL' ? '대분류를 먼저 선택하세요' : `${large} 하위 분류`} options={large === 'ALL' ? [] : mediumOptions} selected={medium} onSelect={onMediumChange} getCount={(value) => countFor('medium', value)} muted={large === 'ALL'} />
          <CategoryColumn title="3. 소분류" description={medium === 'ALL' ? '중분류를 먼저 선택하세요' : `${medium} SKU 품목`} options={medium === 'ALL' ? [] : smallOptions} selected={small} onSelect={onSmallChange} getCount={(value) => countFor('small', value)} muted={medium === 'ALL'} />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4"><div><p className="text-[10px] font-bold text-slate-500">현재 선택</p><p className="mt-1 text-xs font-black text-slate-900">{path || '전체 카테고리'}</p></div><div className="flex items-center gap-2"><button type="button" onClick={onReset} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white">전체 초기화</button><button type="button" onClick={onClose} className="rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0B392B]">선택 완료</button></div></footer>
      </section>
    </div>
  );
}

function CategoryColumn({ title, description, options, selected, onSelect, getCount, muted = false }: { title: string; description: string; options: string[]; selected: string; onSelect: (value: string) => void; getCount: (value: string) => number; muted?: boolean }) {
  return <div className={`border-b border-slate-200 p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${muted ? 'bg-slate-50' : 'bg-white'}`}><div className="mb-3"><p className={`text-xs font-black ${muted ? 'text-slate-500' : 'text-slate-900'}`}>{title}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{description}</p></div>{options.length > 0 ? <div className="space-y-1.5">{options.map((option) => { const active = selected === option; return <button key={option} type="button" onClick={() => onSelect(option)} className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${active ? 'border-[#0F4C3A] bg-emerald-50 text-[#0F4C3A]' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}><span className="flex min-w-0 items-center gap-2">{active && <Check className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{option}</span></span><span className={`rounded-full px-2 py-0.5 text-[9px] ${active ? 'bg-white text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{getCount(option)} SKU</span></button>; })}</div> : <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-[11px] font-medium leading-5 text-slate-500">{description}</div>}</div>;
}

export default function UnifiedInventoryPage() {
  return <AppLayout><Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">통합재고를 불러오고 있습니다.</div>}><UnifiedInventoryContent /></Suspense></AppLayout>;
}
