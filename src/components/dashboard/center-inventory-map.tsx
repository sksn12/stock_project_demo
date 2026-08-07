'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CalendarDays,
  MapPinned,
  PackageCheck,
  Snowflake,
  Warehouse,
} from 'lucide-react';

type MapMode = 'AVAILABLE' | 'BALANCE' | 'EXPIRY';
type InventoryStatus = 'SHORTAGE' | 'BALANCED' | 'SURPLUS';

interface CenterMapItem {
  id: string;
  name: string;
  shortName: string;
  region: string;
  type: '자체센터' | '3PL';
  x: number;
  y: number;
  targetStock: number;
  availableHistory: number[];
  stock: number;
  outbound: number;
  nearExpiry: number;
  skuCount: number;
  storage: string;
  channels: string;
  syncedAt: string;
}

const DAYS = ['7/31', '8/1', '8/2', '8/3', '8/4', '8/5', '8/6'];

const CENTERS: CenterMapItem[] = [
  {
    id: 'GWANGJU', name: '경기 광주 통합물류센터', shortName: '광주', region: '수도권', type: '자체센터', x: 39, y: 27,
    targetStock: 820, availableHistory: [742, 786, 824, 918, 1014, 1068, 1086], stock: 1240, outbound: 154,
    nearExpiry: 92, skuCount: 34, storage: '냉동 · 냉장', channels: '그리팅몰 · 판교점 · 더현대 서울', syncedAt: '2026.08.06 05:00',
  },
  {
    id: 'DNB', name: 'DNB 파트너스 이천센터', shortName: '이천 3PL', region: '수도권', type: '3PL', x: 58, y: 38,
    targetStock: 470, availableHistory: [418, 442, 461, 488, 512, 506, 498], stock: 574, outbound: 76,
    nearExpiry: 28, skuCount: 21, storage: '상온 · 냉장', channels: '모두의 맛집 · 그리팅몰', syncedAt: '2026.08.06 05:00',
  },
  {
    id: 'DAEGU', name: '대구 냉동센터', shortName: '대구', region: '영남권', type: '자체센터', x: 69, y: 72,
    targetStock: 260, availableHistory: [302, 286, 258, 236, 219, 196, 180], stock: 214, outbound: 34,
    nearExpiry: 46, skuCount: 17, storage: '냉동', channels: '더현대 대구 · 영남권 행사', syncedAt: '2026.08.06 05:00',
  },
];

const MODE_LABELS: Record<MapMode, string> = {
  AVAILABLE: '가용재고',
  BALANCE: '재고 균형',
  EXPIRY: '소비기한 위험',
};

function getStatus(available: number, target: number): InventoryStatus {
  const ratio = available / target;
  if (ratio < 0.8) return 'SHORTAGE';
  if (ratio > 1.2) return 'SURPLUS';
  return 'BALANCED';
}

const STATUS_META: Record<InventoryStatus, { label: string; marker: string; text: string }> = {
  SHORTAGE: { label: '부족', marker: 'bg-rose-600 ring-rose-200', text: 'text-rose-700' },
  BALANCED: { label: '적정', marker: 'bg-emerald-700 ring-emerald-200', text: 'text-emerald-700' },
  SURPLUS: { label: '과잉', marker: 'bg-amber-600 ring-amber-200', text: 'text-amber-800' },
};

function markerClass(mode: MapMode, center: CenterMapItem, dayIndex: number) {
  if (mode === 'BALANCE') return STATUS_META[getStatus(center.availableHistory[dayIndex], center.targetStock)].marker;
  if (mode === 'EXPIRY') {
    const rate = center.nearExpiry / Math.max(1, center.availableHistory[dayIndex]);
    return rate >= 0.15 ? 'bg-rose-700 ring-rose-200' : rate >= 0.08 ? 'bg-orange-600 ring-orange-200' : 'bg-amber-500 ring-amber-100';
  }
  const maxAvailable = Math.max(...CENTERS.map((item) => item.availableHistory[dayIndex]));
  const intensity = center.availableHistory[dayIndex] / maxAvailable;
  return intensity >= 0.75 ? 'bg-emerald-800 ring-emerald-200' : intensity >= 0.4 ? 'bg-emerald-600 ring-emerald-100' : 'bg-teal-500 ring-teal-100';
}

export function CenterInventoryMap() {
  const [mode, setMode] = useState<MapMode>('AVAILABLE');
  const [selectedCenterId, setSelectedCenterId] = useState('GWANGJU');
  const [dayIndex, setDayIndex] = useState(DAYS.length - 1);
  const selectedCenter = CENTERS.find((center) => center.id === selectedCenterId) ?? CENTERS[0];
  const selectedAvailable = selectedCenter.availableHistory[dayIndex];
  const selectedStatus = getStatus(selectedAvailable, selectedCenter.targetStock);
  const selectedStatusMeta = STATUS_META[selectedStatus];
  const maxHistory = Math.max(...selectedCenter.availableHistory);
  const totalAvailable = useMemo(() => CENTERS.reduce((sum, center) => sum + center.availableHistory[dayIndex], 0), [dayIndex]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950"><MapPinned className="h-4 w-4 text-[#0F4C3A]" />물류센터 가용재고 히트맵</h2>
            <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-800">P2 PREVIEW</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">센터별 가용재고와 적정재고 대비 상태를 권역 단위로 비교합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="지도 표시 기준">
          {(Object.keys(MODE_LABELS) as MapMode[]).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} aria-pressed={mode === item} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${mode === item ? 'bg-[#0F4C3A] text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>{MODE_LABELS[item]}</button>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-slate-50 to-emerald-50">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            <div className="absolute left-4 top-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[10px] font-bold text-slate-600 shadow-sm">대한민국 물류 운영권역 · 목업</div>
            <div className="absolute left-[15%] top-[20%] text-[10px] font-black tracking-[0.18em] text-slate-400">수도권</div>
            <div className="absolute bottom-[18%] right-[15%] text-[10px] font-black tracking-[0.18em] text-slate-400">영남권</div>

            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M39 27 C46 30, 51 34, 58 38" fill="none" stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
              <path d="M58 38 C62 49, 66 60, 69 72" fill="none" stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
            </svg>

            {CENTERS.map((center) => {
              const available = center.availableHistory[dayIndex];
              const status = getStatus(available, center.targetStock);
              const size = 54 + Math.round(Math.sqrt(available) * 1.1);
              const selected = center.id === selectedCenter.id;
              return (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => setSelectedCenterId(center.id)}
                  aria-label={`${center.name}, 가용재고 ${available}개, ${STATUS_META[status].label}`}
                  aria-pressed={selected}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
                  style={{ left: `${center.x}%`, top: `${center.y}%`, width: size, height: size }}
                >
                  <span className={`absolute inset-0 rounded-full ring-8 transition group-hover:scale-105 ${markerClass(mode, center, dayIndex)} ${selected ? 'ring-offset-4 ring-offset-white' : ''}`} />
                  <span className="relative z-10 flex h-full flex-col items-center justify-center text-white drop-shadow-sm"><strong className="text-xs">{center.shortName}</strong><span className="mt-0.5 text-[10px] font-bold">{available.toLocaleString()}</span></span>
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-800 opacity-0 shadow-lg transition group-hover:opacity-100">{STATUS_META[status].label} · {center.type}</span>
                </button>
              );
            })}

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm">
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                {mode === 'BALANCE' ? <><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-rose-600" />부족</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-700" />적정</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-amber-600" />과잉</span></> : <span>원의 크기 = 가용재고 · 표시 기준 = {MODE_LABELS[mode]}</span>}
              </div>
              <strong className="text-xs text-slate-900">전체 가용 {totalAvailable.toLocaleString()}개</strong>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><CalendarDays className="h-4 w-4 text-[#0F4C3A]" />최근 7일</div>
            <input aria-label="재고 기준일" type="range" min="0" max={DAYS.length - 1} step="1" value={dayIndex} onChange={(event) => setDayIndex(Number(event.target.value))} className="h-2 flex-1 cursor-pointer accent-[#0F4C3A]" />
            <span className="min-w-12 rounded-lg bg-slate-100 px-2 py-1 text-center text-[11px] font-black text-slate-800">{DAYS[dayIndex]}</span>
          </div>
        </div>

        <aside className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black text-[#0F4C3A]">선택 센터</p><h3 className="mt-1 text-base font-black text-slate-950">{selectedCenter.name}</h3><p className="mt-1 text-[11px] font-medium text-slate-600">{selectedCenter.region} · {selectedCenter.type} · {selectedCenter.storage}</p></div>
            <Warehouse className="h-5 w-5 shrink-0 text-slate-500" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-600">현재고</p><p className="mt-1 text-lg font-black text-slate-950">{selectedCenter.stock.toLocaleString()}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold text-emerald-800">가용재고</p><p className="mt-1 text-lg font-black text-emerald-900">{selectedAvailable.toLocaleString()}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-600">출고 예정</p><p className="mt-1 text-lg font-black text-slate-950">{selectedCenter.outbound.toLocaleString()}</p></div>
            <div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold text-rose-800">임박 재고</p><p className="mt-1 text-lg font-black text-rose-800">{selectedCenter.nearExpiry.toLocaleString()}</p></div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-600">목표재고 대비</span><strong className={selectedStatusMeta.text}>{selectedStatusMeta.label} · {Math.round(selectedAvailable / selectedCenter.targetStock * 100)}%</strong></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${selectedStatus === 'SHORTAGE' ? 'bg-rose-600' : selectedStatus === 'SURPLUS' ? 'bg-amber-600' : 'bg-emerald-700'}`} style={{ width: `${Math.min(100, selectedAvailable / selectedCenter.targetStock * 100)}%` }} /></div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between"><p className="text-[11px] font-black text-slate-800">7일 가용재고 변화</p><span className="text-[10px] font-bold text-slate-600">{selectedCenter.availableHistory[0].toLocaleString()} → {selectedAvailable.toLocaleString()}</span></div>
            <div className="mt-3 flex h-16 items-end gap-1.5" aria-label={`${selectedCenter.name} 7일 가용재고 추이`}>
              {selectedCenter.availableHistory.map((value, index) => <button key={DAYS[index]} type="button" onClick={() => setDayIndex(index)} aria-label={`${DAYS[index]} 가용재고 ${value}`} className={`flex-1 rounded-t transition ${index === dayIndex ? 'bg-[#0F4C3A]' : 'bg-emerald-200 hover:bg-emerald-300'}`} style={{ height: `${Math.max(22, value / maxHistory * 100)}%` }} />)}
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-[11px]">
            <div className="flex items-center justify-between"><dt className="flex items-center gap-1.5 font-semibold text-slate-600"><Boxes className="h-3.5 w-3.5" />관리 SKU</dt><dd className="font-black text-slate-900">{selectedCenter.skuCount}개</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="flex items-center gap-1.5 font-semibold text-slate-600"><PackageCheck className="mt-0.5 h-3.5 w-3.5" />연계 채널</dt><dd className="text-right font-bold text-slate-800">{selectedCenter.channels}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-1.5 font-semibold text-slate-600"><Snowflake className="h-3.5 w-3.5" />최근 동기화</dt><dd className="font-bold text-slate-800">{selectedCenter.syncedAt}</dd></div>
          </dl>

          <Link href="/inventory/all" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0F4C3A] bg-white px-4 py-2.5 text-xs font-black text-[#0F4C3A] transition hover:bg-emerald-50">센터별 재고 상세 보기<ArrowRight className="h-3.5 w-3.5" /></Link>
        </aside>
      </div>
    </section>
  );
}
