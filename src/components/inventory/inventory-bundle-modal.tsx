'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ImageOff,
  Layers3,
  MessageSquareShare,
  Minus,
  PackageCheck,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react';
import type { InventoryProduct, InventorySku } from '@/lib/inventory-control-data';
import { INVENTORY_PRODUCTS, SKU_OPERATION_DATA } from '@/lib/inventory-control-data';
import {
  CHANNEL_TYPE_META,
  GREENFOOD_CHANNEL_INVENTORY,
  type ChannelInventory,
} from '@/lib/greenfood-channel-data';

export interface BundleSourceItem {
  product: InventoryProduct;
  sku: InventorySku;
  channel: ChannelInventory;
}

interface InventoryBundleModalProps {
  selectedItems: BundleSourceItem[];
  onClose: () => void;
  onSaved?: (bundleCode: string) => void;
}

interface ValidationItem {
  label: string;
  detail: string;
  status: 'PASS' | 'WARNING' | 'BLOCK';
}

function formatCurrency(value: number) {
  return `₩${Math.round(value).toLocaleString('ko-KR')}`;
}

function getStorageType(item: BundleSourceItem) {
  return item.sku.options['보관'] ?? '냉동';
}

function getExpiryDays(sku: InventorySku) {
  return Number(sku.expiryLabel.match(/\d+/)?.[0] ?? 365);
}

function BundleThumbnail({ item }: { item: BundleSourceItem }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = SKU_OPERATION_DATA[item.sku.id]?.imageUrl ?? item.product.imageUrl;

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {failed ? <ImageOff className="h-4 w-4 text-slate-400" /> : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={`${item.product.name} ${item.sku.optionLabel}`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export function InventoryBundleModal({ selectedItems, onClose, onSaved }: InventoryBundleModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(selectedItems);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(selectedItems.map((item) => [item.channel.id, 1])));
  const channelOptions = useMemo(() => Array.from(new Map(
    GREENFOOD_CHANNEL_INVENTORY
      .filter((item) => item.channelType !== 'CENTER')
      .map((item) => [item.channelName, { name: item.channelName, type: item.channelType }])
  ).values()), []);
  const [targetChannel, setTargetChannel] = useState(selectedItems[0]?.channel.channelName ?? channelOptions[0]?.name ?? '그리팅몰');
  const [bundleName, setBundleName] = useState(() => `${selectedItems[0]?.product.brand ?? '그리팅'} 추천 세트`);
  const [discountRate, setDiscountRate] = useState(10);
  const [targetQuantity, setTargetQuantity] = useState(10);
  const [startDate, setStartDate] = useState('2026-08-07');
  const [endDate, setEndDate] = useState('2026-08-20');
  const [saved, setSaved] = useState(false);
  const [candidateTab, setCandidateTab] = useState<'RECOMMENDED' | 'SEARCH'>('RECOMMENDED');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [teamsChannel, setTeamsChannel] = useState('재고전략-통합운영');
  const [teamsMessage, setTeamsMessage] = useState('');
  const [teamsShareState, setTeamsShareState] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE');
  const [teamsSharedAt, setTeamsSharedAt] = useState('');
  const bundleCode = 'BND-20260806-001';
  const baseChannelId = selectedItems[0]?.channel.id;

  useEffect(() => {
    nameInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const maxBundleQuantity = items.length > 0
    ? Math.min(...items.map((item) => Math.floor(item.channel.availableStock / (quantities[item.channel.id] ?? 1))))
    : 0;
  const listPrice = items.reduce((sum, item) => sum + item.sku.sellingPrice * (quantities[item.channel.id] ?? 1), 0);
  const sellingPrice = Math.round((listPrice * (1 - discountRate / 100)) / 100) * 100;
  const estimatedUnitCost = items.reduce((sum, item) => sum + item.sku.sellingPrice * 0.62 * (quantities[item.channel.id] ?? 1), 0) + 800;
  const expectedRevenue = sellingPrice * Math.max(0, targetQuantity);
  const expectedProfit = Math.round((sellingPrice - estimatedUnitCost) * Math.max(0, targetQuantity));
  const marginRate = sellingPrice > 0 ? Math.round(((sellingPrice - estimatedUnitCost) / sellingPrice) * 100) : 0;
  const storageTypes = new Set(items.map(getStorageType));
  const sourceCenters = new Set(items.map((item) => item.channel.fulfillmentCenter));
  const moveRequiredItems = items.filter((item) => item.channel.channelName !== targetChannel);
  const expiryLimit = items.length > 0 ? Math.min(...items.map((item) => getExpiryDays(item.sku))) : 0;
  const targetChannelMeta = channelOptions.find((item) => item.name === targetChannel);
  const candidates = useMemo(() => {
    const selectedSkuIds = new Set(items.map((item) => item.sku.id));
    const normalizedQuery = candidateQuery.trim().toLowerCase();

    return INVENTORY_PRODUCTS
      .filter((product) => product.affiliate === '현대그린푸드')
      .flatMap((product) => product.skus.map((sku) => ({ product, sku })))
      .filter(({ product, sku }) => {
        if (selectedSkuIds.has(sku.id)) return false;
        if (candidateTab === 'RECOMMENDED' || !normalizedQuery) return true;
        return [product.name, product.productCode, product.category, sku.code, sku.optionLabel, ...Object.values(sku.options)]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .flatMap(({ product, sku }) => {
        const channelRows = GREENFOOD_CHANNEL_INVENTORY.filter((row) => row.skuId === sku.id && row.channelType !== 'CENTER' && row.availableStock > 0);
        const channel = channelRows.find((row) => row.channelName === targetChannel)
          ?? [...channelRows].sort((left, right) => right.availableStock - left.availableStock)[0];
        if (!channel) return [];
        const storage = sku.options['보관'] ?? '냉동';
        const storageMatch = items.every((item) => getStorageType(item) === storage);
        const sameTargetChannel = channel.channelName === targetChannel;
        const categoryComplement = items.every((item) => item.product.category !== product.category);
        const score = Math.min(98, Math.round(58 + (storageMatch ? 16 : 2) + (sameTargetChannel ? 12 : 4) + (categoryComplement ? 7 : 3) + Math.min(5, sku.riskScore / 20)));
        const reason = `${storageMatch ? `${storage} 보관조건이 같고` : '분리 포장 검토가 필요하지만'} ${sameTargetChannel ? `${targetChannel} 재고를 바로 활용할 수 있습니다.` : `${channel.channelName}의 가용재고를 이동해 구성할 수 있습니다.`}`;
        return [{ product, sku, channel, score, reason }];
      })
      .sort((left, right) => right.score - left.score || right.channel.availableStock - left.channel.availableStock)
      .slice(0, candidateTab === 'RECOMMENDED' ? 4 : 8);
  }, [candidateQuery, candidateTab, items, targetChannel]);

  const validations: ValidationItem[] = [
    {
      label: '구성 SKU 수',
      detail: items.length >= 2 ? `${items.length}개 SKU가 선택되었습니다.` : '번들은 서로 다른 SKU 2개 이상으로 구성해야 합니다.',
      status: items.length >= 2 ? 'PASS' : 'BLOCK',
    },
    {
      label: '판매 가능 재고',
      detail: `현재 구성비 기준 최대 ${maxBundleQuantity}세트까지 만들 수 있습니다.`,
      status: maxBundleQuantity > 0 && targetQuantity > 0 && targetQuantity <= maxBundleQuantity ? 'PASS' : 'BLOCK',
    },
    {
      label: '행사 기간',
      detail: startDate && endDate && endDate >= startDate ? `선택한 SKU의 최소 소비기한은 D-${expiryLimit}입니다.` : '종료일은 시작일보다 빠를 수 없습니다.',
      status: startDate && endDate && endDate >= startDate ? (expiryLimit <= 7 ? 'WARNING' : 'PASS') : 'BLOCK',
    },
    {
      label: '보관·배송 호환성',
      detail: storageTypes.size > 1 ? `${Array.from(storageTypes).join('·')} 상품이 함께 있어 분리 포장 검토가 필요합니다.` : `${Array.from(storageTypes)[0] ?? '동일'} 조건으로 운영할 수 있습니다.`,
      status: storageTypes.size > 1 ? 'WARNING' : 'PASS',
    },
    {
      label: '재고 이동',
      detail: moveRequiredItems.length > 0 ? `${moveRequiredItems.length}개 SKU는 선택 판매채널로 재고 이동 또는 할당 변경이 필요합니다.` : '모든 구성 SKU가 선택 판매채널에 있습니다.',
      status: moveRequiredItems.length > 0 || sourceCenters.size > 1 ? 'WARNING' : 'PASS',
    },
    {
      label: '예상 공헌이익',
      detail: `조립비 800원과 추정 매입원가를 반영한 공헌이익률은 ${marginRate}%입니다.`,
      status: marginRate >= 15 ? 'PASS' : 'BLOCK',
    },
  ];

  const blockingCount = validations.filter((item) => item.status === 'BLOCK').length;
  const warningCount = validations.filter((item) => item.status === 'WARNING').length;
  const canSave = blockingCount === 0 && bundleName.trim().length > 0;

  const updateQuantity = (channelId: string, next: number) => {
    setQuantities((current) => ({ ...current, [channelId]: Math.min(10, Math.max(1, next)) }));
    setSaved(false);
  };

  const removeItem = (channelId: string) => {
    setItems((current) => current.filter((item) => item.channel.id !== channelId));
    setSaved(false);
  };

  const addCandidate = (candidate: BundleSourceItem) => {
    if (items.length >= 5 || items.some((item) => item.sku.id === candidate.sku.id)) return;
    setItems((current) => [...current, candidate]);
    setQuantities((current) => ({ ...current, [candidate.channel.id]: 1 }));
    setSaved(false);
  };

  const saveDraft = () => {
    if (!canSave) return;
    setSaved(true);
    setTeamsMessage(`[번들 전략 검토 요청] ${bundleName}\n${bundleCode} · ${targetChannel} · ${items.length}개 SKU · 목표 ${targetQuantity}세트\n예상 매출 ${formatCurrency(expectedRevenue)} · 예상 공헌이익 ${formatCurrency(expectedProfit)}`);
    setTeamsShareState('IDLE');
    setTeamsSharedAt('');
    onSaved?.(bundleCode);
  };

  const shareToTeams = () => {
    if (!saved || !teamsMessage.trim() || teamsShareState !== 'IDLE') return;
    setTeamsShareState('SENDING');
    window.setTimeout(() => {
      setTeamsShareState('SENT');
      setTeamsSharedAt(new Date().toLocaleString('ko-KR', { hour12: false }));
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="bundle-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0F4C3A]"><Layers3 className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="bundle-modal-title" className="text-lg font-black text-slate-950">SKU 번들 상품 구성</h2>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800">시뮬레이션</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">판매처별 가용재고를 기준으로 구성수량·가격·운영조건을 검증합니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="번들 모달 닫기" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-black text-slate-950">번들 SKU 추가</p><p className="mt-1 text-[10px] text-slate-500">추천 목록에서 고르거나 상품명·SKU 코드로 직접 검색하세요.</p></div>
                  <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                    <button type="button" onClick={() => setCandidateTab('RECOMMENDED')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold ${candidateTab === 'RECOMMENDED' ? 'bg-[#0F4C3A] text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Sparkles className="h-3.5 w-3.5" />추천 번들</button>
                    <button type="button" onClick={() => setCandidateTab('SEARCH')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold ${candidateTab === 'SEARCH' ? 'bg-[#0F4C3A] text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Search className="h-3.5 w-3.5" />직접 검색</button>
                  </div>
                </div>

                {candidateTab === 'SEARCH' && (
                  <label className="relative mt-3 block"><span className="sr-only">번들 SKU 검색</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="상품명, 상품코드, SKU 코드, 옵션 검색" className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none focus:border-[#0F4C3A]" />{candidateQuery && <button type="button" onClick={() => setCandidateQuery('')} aria-label="번들 검색어 지우기" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>}</label>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {candidates.map((candidate) => (
                    <article key={`${candidate.sku.id}-${candidate.channel.id}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-2.5">
                        <BundleThumbnail item={candidate} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">{candidateTab === 'RECOMMENDED' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">적합도 {candidate.score}%</span>}<span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${CHANNEL_TYPE_META[candidate.channel.channelType].className}`}>{CHANNEL_TYPE_META[candidate.channel.channelType].label}</span></div>
                          <p className="mt-1.5 truncate text-xs font-black text-slate-950">{candidate.sku.optionLabel}</p>
                          <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">{candidate.sku.code}</p>
                        </div>
                      </div>
                      {candidateTab === 'RECOMMENDED' && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[9px] leading-4 text-slate-600">{candidate.reason}</p>}
                      <div className="mt-2 flex items-end justify-between gap-2"><div className="min-w-0 text-[9px] text-slate-600"><p className="truncate">{candidate.channel.channelName}</p><p className="mt-0.5">가용 <strong className="text-slate-900">{candidate.channel.availableStock.toLocaleString()}{candidate.sku.unit}</strong></p></div><button type="button" onClick={() => addCandidate(candidate)} disabled={items.length >= 5} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#0F4C3A] px-3 text-[10px] font-bold text-white hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Plus className="h-3 w-3" />추가</button></div>
                    </article>
                  ))}
                  {candidates.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-[10px] text-slate-500">검색 조건에 맞는 추가 가능 SKU가 없습니다.</div>}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-black text-slate-950">번들 구성 SKU</p><p className="mt-1 text-[10px] text-slate-500">최소 2개 · 최대 5개 SKU, 세트당 수량 1~10개</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-700">{items.length}개 선택</span>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const quantity = quantities[item.channel.id] ?? 1;
                  const possibleSets = Math.floor(item.channel.availableStock / quantity);
                  return (
                    <article key={item.channel.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <BundleThumbnail item={item} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${CHANNEL_TYPE_META[item.channel.channelType].className}`}>{CHANNEL_TYPE_META[item.channel.channelType].label}</span>
                            {item.channel.id === baseChannelId && <span className="rounded-full bg-[#0F4C3A] px-2 py-0.5 text-[9px] font-bold text-white">기준 SKU</span>}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{getStorageType(item)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getExpiryDays(item.sku) <= 7 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.sku.expiryLabel}</span>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-black text-slate-950">{item.sku.optionLabel}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{item.product.name} · <span className="font-mono">{item.sku.code}</span></p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-600">{item.channel.channelName} · 가용 {item.channel.availableStock.toLocaleString()}{item.sku.unit}</p>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                          <div className="text-right"><p className="text-[9px] text-slate-400">판매가</p><p className="mt-1 text-xs font-black text-slate-900">{formatCurrency(item.sku.sellingPrice)}</p><p className="mt-1 text-[9px] font-semibold text-emerald-700">최대 {possibleSets}세트</p></div>
                          <div>
                            <p className="text-center text-[9px] font-bold text-slate-500">세트당 수량</p>
                            <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                              <button type="button" onClick={() => updateQuantity(item.channel.id, quantity - 1)} aria-label={`${item.sku.optionLabel} 수량 줄이기`} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white"><Minus className="h-3 w-3" /></button>
                              <span className="w-8 text-center text-xs font-black tabular-nums">{quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.channel.id, quantity + 1)} aria-label={`${item.sku.optionLabel} 수량 늘리기`} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white"><Plus className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeItem(item.channel.id)} disabled={item.channel.id === baseChannelId} aria-label={`${item.sku.optionLabel} 번들에서 제거`} title={item.channel.id === baseChannelId ? '기준 SKU는 제거할 수 없습니다.' : undefined} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-950">번들 사전 검증</p><p className="mt-1 text-[10px] text-slate-500">가용재고·기한·보관·이동·수익 조건</p></div><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${blockingCount > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : warningCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>차단 {blockingCount} · 확인 {warningCount}</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {validations.map((item) => (
                    <div key={item.label} className={`rounded-xl border p-3 ${item.status === 'BLOCK' ? 'border-rose-200 bg-rose-50' : item.status === 'WARNING' ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-white'}`}>
                      <div className="flex items-center gap-1.5">{item.status === 'BLOCK' ? <Ban className="h-3.5 w-3.5 text-rose-600" /> : item.status === 'WARNING' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}<p className="text-[10px] font-black text-slate-800">{item.label} · {item.status === 'BLOCK' ? '저장 불가' : item.status === 'WARNING' ? '확인 필요' : '통과'}</p></div>
                      <p className="mt-1.5 text-[9px] leading-4 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="xl:sticky xl:top-0">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between"><div><p className="text-sm font-black text-slate-950">번들 초안</p><p className="mt-1 font-mono text-[9px] text-slate-400">{bundleCode}</p></div><PackageCheck className="h-5 w-5 text-[#0F4C3A]" /></div>

                <div className="mt-4 space-y-3">
                  <label className="block text-[10px] font-bold text-slate-600">번들명<input ref={nameInputRef} value={bundleName} onChange={(event) => { setBundleName(event.target.value); setSaved(false); }} maxLength={40} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-[#0F4C3A]" /></label>
                  <label className="block text-[10px] font-bold text-slate-600">판매채널<div className="relative mt-1.5"><Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select value={targetChannel} onChange={(event) => { setTargetChannel(event.target.value); setSaved(false); }} className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-bold outline-none focus:border-[#0F4C3A]">{channelOptions.map((channel) => <option key={channel.name} value={channel.name}>{channel.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div><span className="mt-1 inline-block text-[9px] font-medium text-slate-400">{targetChannelMeta ? CHANNEL_TYPE_META[targetChannelMeta.type].description : ''}</span></label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-bold text-slate-600">시작일<div className="relative mt-1.5"><CalendarClock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setSaved(false); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-1 text-[10px] font-semibold outline-none" /></div></label>
                    <label className="text-[10px] font-bold text-slate-600">종료일<input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setSaved(false); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-[10px] font-semibold outline-none" /></label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-bold text-slate-600">할인율<div className="relative mt-1.5"><input type="number" min="0" max="40" value={discountRate} onChange={(event) => { setDiscountRate(Math.min(40, Math.max(0, Number(event.target.value)))); setSaved(false); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-7 text-xs font-black outline-none" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span></div></label>
                    <label className="text-[10px] font-bold text-slate-600">목표 수량<div className="relative mt-1.5"><input type="number" min="1" max={Math.max(1, maxBundleQuantity)} value={targetQuantity} onChange={(event) => { setTargetQuantity(Number(event.target.value)); setSaved(false); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-xs font-black outline-none" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">세트</span></div></label>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-slate-400">정상 합산가</p><p className="mt-1 text-sm font-black text-slate-800">{formatCurrency(listPrice)}</p></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] text-emerald-700">번들 판매가</p><p className="mt-1 text-sm font-black text-emerald-800">{formatCurrency(sellingPrice)}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-slate-400">최대 구성</p><p className="mt-1 text-sm font-black text-slate-800">{maxBundleQuantity}세트</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-slate-400">예상 이익률</p><p className={`mt-1 text-sm font-black ${marginRate >= 15 ? 'text-[#0F4C3A]' : 'text-rose-600'}`}>{marginRate}%</p></div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10px]">
                  <div className="flex items-center justify-between text-slate-500"><span className="inline-flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" />예상 매출</span><strong className="text-slate-900">{formatCurrency(expectedRevenue)}</strong></div>
                  <div className="mt-2 flex items-center justify-between text-slate-500"><span>예상 공헌이익</span><strong className={expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatCurrency(expectedProfit)}</strong></div>
                </div>

                {moveRequiredItems.length > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] leading-4 text-amber-900"><Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{moveRequiredItems.length}개 구성품은 {targetChannel} 판매 전 재고 이동 또는 할당 변경이 필요합니다.</div>}
                {saved && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[10px] font-semibold leading-4 text-emerald-900"><strong>{bundleCode}</strong> 번들 초안이 저장되었습니다. 실제 상품 등록이나 재고 차감은 수행되지 않습니다.</div>
                    <div className="rounded-xl border border-[#6264A7]/40 bg-[#F7F7FC] p-3">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6264A7] text-white"><MessageSquareShare className="h-4 w-4" /></span><div><p className="text-[11px] font-black text-slate-950">Microsoft Teams 공유</p><p className="mt-0.5 text-[9px] font-medium text-slate-600">전략 링크와 요약을 담당자 채널에 전달합니다.</p></div></div><span className="rounded-full border border-[#6264A7]/30 bg-white px-2 py-0.5 text-[9px] font-black text-[#4B4D8F]">MOCK</span></div>

                      <label className="mt-3 block text-[10px] font-bold text-slate-700">Teams 채널<div className="relative mt-1.5"><Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6264A7]" /><select value={teamsChannel} onChange={(event) => { setTeamsChannel(event.target.value); setTeamsShareState('IDLE'); }} disabled={teamsShareState === 'SENT'} className="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-[10px] font-bold text-slate-800 outline-none focus:border-[#6264A7]"><option value="재고전략-통합운영">재고전략-통합운영</option><option value="그리팅몰-MD">그리팅몰-MD</option><option value="백화점 식품관-재고운영">백화점 식품관-재고운영</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" /></div></label>
                      <label className="mt-3 block text-[10px] font-bold text-slate-700">공유 메시지<textarea value={teamsMessage} onChange={(event) => { setTeamsMessage(event.target.value); setTeamsShareState('IDLE'); }} disabled={teamsShareState === 'SENT'} rows={4} className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-medium leading-4 text-slate-800 outline-none focus:border-[#6264A7]" /></label>

                      {teamsShareState === 'SENT' && <div className="mt-3 rounded-lg border border-[#6264A7]/30 bg-white p-2.5 text-[9px] leading-4 text-slate-700"><p className="font-black text-[#4B4D8F]">Teams 공유 완료</p><p className="mt-0.5">#{teamsChannel} · {teamsSharedAt} · 전송 이력 저장됨</p></div>}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3.5">
          <div className="min-h-8 text-[10px] font-semibold">
            {blockingCount > 0 ? <p className="inline-flex items-center gap-1.5 text-rose-700"><Ban className="h-3.5 w-3.5" />차단 항목 {blockingCount}건을 해결해야 저장할 수 있습니다.</p> : warningCount > 0 ? <p className="inline-flex items-center gap-1.5 text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />확인 필요 {warningCount}건이 있지만 목업 초안은 저장할 수 있습니다.</p> : <p className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />모든 사전 검증을 통과했습니다.</p>}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100">취소</button>
            {!saved ? <button type="button" onClick={saveDraft} disabled={!canSave} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Save className="h-4 w-4" />번들 초안 저장 ({items.length}개 SKU)</button> : <button type="button" onClick={shareToTeams} disabled={!teamsMessage.trim() || teamsShareState !== 'IDLE'} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#6264A7] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4B4D8F] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Send className="h-4 w-4" />{teamsShareState === 'SENDING' ? 'Teams 전송 중' : teamsShareState === 'SENT' ? 'Teams 공유 완료' : 'Teams로 공유'}</button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
