'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
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
  Trash2,
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
  const rounded = Math.round(value);
  return `${rounded < 0 ? '-' : ''}₩${Math.abs(rounded).toLocaleString('ko-KR')}`;
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
  const [bundleName, setBundleName] = useState(() => `${selectedItems[0]?.product.brand ?? '그리팅'} 추천 세트`);
  const [bundleSellingPrice, setBundleSellingPrice] = useState(() => selectedItems.reduce((sum, item) => sum + item.sku.sellingPrice, 0));
  const [priceTouched, setPriceTouched] = useState(false);
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
  const estimatedUnitCost = Math.round(items.reduce((sum, item) => sum + item.sku.sellingPrice * 0.62 * (quantities[item.channel.id] ?? 1), 0) + 800);
  const expectedProfit = Math.round(bundleSellingPrice - estimatedUnitCost);
  const marginRate = bundleSellingPrice > 0 ? Math.round((expectedProfit / bundleSellingPrice) * 1000) / 10 : null;
  const storageTypes = new Set(items.map(getStorageType));
  const referenceChannel = selectedItems[0]?.channel.channelName;

  useEffect(() => {
    if (!priceTouched) setBundleSellingPrice(listPrice);
  }, [listPrice, priceTouched]);

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
        const channel = channelRows.find((row) => row.channelName === referenceChannel)
          ?? [...channelRows].sort((left, right) => right.availableStock - left.availableStock)[0];
        if (!channel) return [];
        const storage = sku.options['보관'] ?? '냉동';
        const storageMatch = items.every((item) => getStorageType(item) === storage);
        const sameReferenceChannel = channel.channelName === referenceChannel;
        const categoryComplement = items.every((item) => item.product.category !== product.category);
        const score = Math.min(98, Math.round(58 + (storageMatch ? 16 : 2) + (sameReferenceChannel ? 12 : 4) + (categoryComplement ? 7 : 3) + Math.min(5, sku.riskScore / 20)));
        const reason = `${storageMatch ? `${storage} 보관조건이 같고` : '분리 포장 검토가 필요하지만'} ${sameReferenceChannel ? `${referenceChannel} 가용재고를 함께 활용할 수 있습니다.` : `${channel.channelName}에 판매 가능한 재고가 있습니다.`}`;
        return [{ product, sku, channel, score, reason }];
      })
      .sort((left, right) => right.score - left.score || right.channel.availableStock - left.channel.availableStock)
      .slice(0, candidateTab === 'RECOMMENDED' ? 4 : 8);
  }, [candidateQuery, candidateTab, items, referenceChannel]);

  const validations: ValidationItem[] = [
    {
      label: '구성 SKU 수',
      detail: items.length >= 2 ? `${items.length}개 SKU가 선택되었습니다.` : '번들은 서로 다른 SKU 2개 이상으로 구성해야 합니다.',
      status: items.length >= 2 ? 'PASS' : 'BLOCK',
    },
    {
      label: '판매 가능 재고',
      detail: `현재 구성비 기준 최대 ${maxBundleQuantity}세트까지 만들 수 있습니다.`,
      status: maxBundleQuantity > 0 ? 'PASS' : 'BLOCK',
    },
    {
      label: '보관·배송 호환성',
      detail: storageTypes.size > 1 ? `${Array.from(storageTypes).join('·')} 상품이 함께 있어 분리 포장 검토가 필요합니다.` : `${Array.from(storageTypes)[0] ?? '동일'} 조건으로 운영할 수 있습니다.`,
      status: storageTypes.size > 1 ? 'WARNING' : 'PASS',
    },
    {
      label: '예상 공헌이익',
      detail: bundleSellingPrice <= 0
        ? '번들 판매가는 0원보다 커야 합니다.'
        : `추정 변동비 ${formatCurrency(estimatedUnitCost)}를 반영한 단위 공헌이익은 ${formatCurrency(expectedProfit)} (${marginRate}%)입니다.`,
      status: bundleSellingPrice <= 0 ? 'BLOCK' : expectedProfit <= 0 ? 'WARNING' : 'PASS',
    },
  ];

  const blockingCount = validations.filter((item) => item.status === 'BLOCK').length;
  const warningCount = validations.filter((item) => item.status === 'WARNING').length;
  const canSave = blockingCount === 0 && bundleName.trim().length > 0 && bundleSellingPrice > 0;

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
    setTeamsMessage(`[번들 초안 검토 요청] ${bundleName}\n${bundleCode} · ${items.length}개 SKU\n번들 판매가 ${formatCurrency(bundleSellingPrice)} · 단위 공헌이익 ${formatCurrency(expectedProfit)} (${marginRate}%)`);
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
              <p className="mt-1 text-xs text-slate-500">판매 가능한 SKU를 조합하고 현재 판매가를 기준으로 번들 가격과 공헌이익을 검토합니다.</p>
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
                  {candidates.map((candidate, candidateIndex) => (
                    <article key={`${candidate.sku.id}-${candidate.channel.id}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-2.5">
                        <BundleThumbnail item={candidate} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">{candidateTab === 'RECOMMENDED' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">추천 {candidateIndex + 1}순위</span>}<span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${CHANNEL_TYPE_META[candidate.channel.channelType].className}`}>{CHANNEL_TYPE_META[candidate.channel.channelType].label}</span></div>
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
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-950">번들 사전 검증</p><p className="mt-1 text-[10px] text-slate-500">구성 SKU·가용재고·보관·단위 수익 조건</p></div><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${blockingCount > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : warningCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>차단 {blockingCount} · 확인 {warningCount}</span></div>
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

                  <div>
                    <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-slate-600">선택된 구성</p><span className="text-[9px] font-bold text-slate-400">{items.length}/5 SKU</span></div>
                    <div className="mt-1.5 space-y-1.5">
                      {items.map((item) => (
                        <div key={`draft-${item.channel.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px]">
                          <div className="min-w-0"><p className="truncate font-bold text-slate-800">{item.sku.optionLabel}</p><p className="mt-0.5 truncate font-mono text-slate-400">{item.sku.code}</p></div>
                          <div className="shrink-0 text-right"><p className="font-black text-slate-800">{quantities[item.channel.id] ?? 1}개</p><p className="mt-0.5 text-slate-500">{formatCurrency(item.sku.sellingPrice * (quantities[item.channel.id] ?? 1))}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="block text-[10px] font-bold text-slate-600">번들 판매가<div className="relative mt-1.5"><input type="number" min="1" step="100" value={bundleSellingPrice} onChange={(event) => { setBundleSellingPrice(Math.max(0, Number(event.target.value))); setPriceTouched(true); setSaved(false); }} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-9 text-sm font-black outline-none focus:border-[#0F4C3A]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">원</span></div><span className="mt-1.5 block text-[9px] font-medium text-slate-500">현재 판매가 합계 {formatCurrency(listPrice)}를 기준으로 지정합니다.</span></label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-slate-500">현재 판매가 합계</p><p className="mt-1 text-sm font-black text-slate-800">{formatCurrency(listPrice)}</p></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] text-emerald-700">번들 판매가</p><p className="mt-1 text-sm font-black text-emerald-800">{formatCurrency(bundleSellingPrice)}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-slate-400">최대 구성</p><p className="mt-1 text-sm font-black text-slate-800">{maxBundleQuantity}세트</p></div>
                  <div className={`rounded-xl p-3 ${expectedProfit < 0 ? 'bg-rose-50' : 'bg-white'}`}><p className={`text-[9px] ${expectedProfit < 0 ? 'text-rose-600' : 'text-slate-500'}`}>예상 공헌이익률</p><p className={`mt-1 text-sm font-black ${expectedProfit < 0 ? 'text-rose-700' : 'text-[#0F4C3A]'}`}>{marginRate === null ? '계산 전' : `${marginRate}%`}</p></div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10px]">
                  <div className="flex items-center justify-between text-slate-500"><span className="inline-flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" />추정 총 변동비</span><strong className="text-slate-900">{formatCurrency(estimatedUnitCost)}</strong></div>
                  <div className="mt-2 flex items-center justify-between text-slate-500"><span>단위 예상 공헌이익</span><strong className={expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(expectedProfit)}</strong></div>
                </div>

                {expectedProfit < 0 && bundleSellingPrice > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-[9px] font-semibold leading-4 text-rose-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />현재 번들 판매가로 판매할 경우 판매 1건당 {formatCurrency(Math.abs(expectedProfit))}의 손실이 발생합니다. 가격 또는 구성 수량을 조정해 주세요.</div>}
                {saved && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[10px] font-semibold leading-4 text-emerald-900"><strong>{bundleCode}</strong> 번들 초안이 저장되었습니다. 판매채널·운영 기간·할인 정책·목표수량은 다음 AI 판매전략 단계에서 설정합니다.</div>
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
            {!saved ? <button type="button" onClick={saveDraft} disabled={!canSave} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Save className="h-4 w-4" />번들 초안 저장 ({items.length}개 SKU)</button> : <><button type="button" onClick={shareToTeams} disabled={!teamsMessage.trim() || teamsShareState !== 'IDLE'} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#6264A7] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4B4D8F] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"><Send className="h-4 w-4" />{teamsShareState === 'SENDING' ? 'Teams 전송 중' : teamsShareState === 'SENT' ? 'Teams 공유 완료' : 'Teams로 공유'}</button><button type="button" onClick={() => window.location.assign('/strategy/generate')} className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B]"><Sparkles className="h-4 w-4" />AI 판매전략 생성</button></>}
          </div>
        </footer>
      </section>
    </div>
  );
}
