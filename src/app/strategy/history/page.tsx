'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { STRATEGY_HISTORY_ROWS, type StrategyStatus } from '@/lib/strategy-workbench-data';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';

const statusMeta: Record<StrategyStatus, { label: string; className: string }> = {
  APPROVED: { label: '승인완료', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  READY: { label: '수립완료', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  GENERATING: { label: '생성중', className: 'border-amber-200 bg-amber-50 text-amber-800' },
};

export default function StrategyHistoryPage() {
  const [status, setStatus] = useState<'ALL' | StrategyStatus>('ALL');
  const [affiliate, setAffiliate] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => STRATEGY_HISTORY_ROWS.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false;
    if (affiliate !== 'ALL' && row.affiliate !== affiliate) return false;
    if (type !== 'ALL' && row.type !== type) return false;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [row.id, row.title, row.productName].join(' ').toLowerCase().includes(normalized);
  }), [affiliate, query, status, type]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-20">
        <header><h1 className="text-2xl font-black text-slate-950">전략 기록</h1><p className="mt-2 text-xs text-slate-500">생성된 AI 판매전략의 상태와 핵심 결과를 확인합니다.</p></header>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto">{([['ALL', '전체'], ['APPROVED', '승인완료'], ['READY', '수립완료'], ['GENERATING', '생성중']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setStatus(id)} className={`rounded-lg px-4 py-2.5 text-xs font-black ${status === id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{label}</button>)}</div>
          <div className="grid gap-2 sm:grid-cols-[170px_140px_300px]">
            <Select value={affiliate} onChange={setAffiliate} options={[['ALL', '전체 계열사'], ['현대그린푸드', '현대그린푸드']]} label="계열사" />
            <Select value={type} onChange={setType} options={[['ALL', '전체 구분'], ['개별', '개별'], ['번들', '번들']]} label="구분" />
            <label className="relative"><span className="sr-only">전략 검색</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="전략번호, 전략명, 상품명 검색" className="h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#0F4C3A]" /></label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="border-b border-slate-200 bg-slate-100 text-[10px] font-black text-slate-500"><tr><th className="px-4 py-4">전략번호</th><th className="px-4 py-4">구분</th><th className="px-4 py-4">전략명</th><th className="px-4 py-4">계열사</th><th className="px-4 py-4">카테고리</th><th className="px-4 py-4">상품명</th><th className="px-4 py-4">상태</th><th className="px-4 py-4">생성일자 ↓</th><th className="px-4 py-4 text-right">상세</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40"><td className="px-4 py-5 font-mono font-black text-slate-900">{row.id}</td><td className="px-4 py-5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.type === '번들' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{row.type}</span></td><td className="px-4 py-5 font-black text-slate-900">{row.title}</td><td className="px-4 py-5 text-slate-600">{row.affiliate}</td><td className="px-4 py-5 text-slate-600">{row.category}</td><td className="px-4 py-5 font-semibold text-slate-700">{row.productName}</td><td className="px-4 py-5"><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${statusMeta[row.status].className}`}>{statusMeta[row.status].label}</span></td><td className="px-4 py-5 tabular-nums text-slate-500">{row.createdAt}</td><td className="px-4 py-5 text-right"><Link href={`/strategy/${row.caseId}`} aria-label={`${row.id} 상세`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0F4C3A] hover:bg-emerald-100"><ArrowRight className="h-4 w-4" /></Link></td></tr>)}{rows.length === 0 && <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-500">조건에 맞는 전략 기록이 없습니다.</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500"><span>총 {rows.length}건</span><div className="flex gap-1"><button className="h-8 w-8 rounded-lg border border-slate-200">‹</button><button className="h-8 w-8 rounded-lg bg-slate-900 font-black text-white">1</button><button className="h-8 w-8 rounded-lg border border-slate-200">›</button></div></div>
        </section>
      </div>
    </AppLayout>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; label: string }) { return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-[#0F4C3A]">{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>; }
