'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { MOCK_INVENTORY_ITEMS } from '@/lib/mock-data';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { Sparkles, CheckCircle2, ArrowRight, Loader2, Database, Calculator, Truck, ShieldCheck } from 'lucide-react';
import { getChannelInventoryItem, getTransferRecommendation } from '@/lib/greenfood-channel-data';

function StrategyGenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawItems = searchParams.get('items');
  const selectedIds = rawItems ? rawItems.split(',') : [];
  const productId = searchParams.get('productId');
  const skuId = searchParams.get('skuId');
  const channelId = searchParams.get('channelId');
  const targetType = searchParams.get('targetType') === 'BUNDLE' ? 'BUNDLE' : 'SKU';
  const bundleCode = searchParams.get('bundleCode');

  const targetProducts = MOCK_INVENTORY_ITEMS.filter((item) => selectedIds.includes(item.id));
  const selectedProduct = INVENTORY_PRODUCTS.find((product) => product.id === productId);
  const selectedSku = selectedProduct?.skus.find((sku) => sku.id === skuId);
  const nextQuery = targetType === 'BUNDLE'
    ? `?${new URLSearchParams({ targetType: 'BUNDLE', bundleCode: bundleCode ?? 'BND-20260806-001' }).toString()}`
    : selectedProduct && selectedSku
    ? `?${new URLSearchParams({ productId: selectedProduct.id, skuId: selectedSku.id, ...(channelId ? { channelId } : {}) }).toString()}`
    : '';
  const recommendation = selectedSku ? getTransferRecommendation(selectedSku.id) : undefined;
  const source = recommendation ? getChannelInventoryItem(recommendation.sourceId) : undefined;
  const destination = recommendation ? getChannelInventoryItem(recommendation.destinationId) : undefined;

  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const timer1 = setTimeout(() => { setStep(2); setProgress(50); }, 1000);
    const timer2 = setTimeout(() => { setStep(3); setProgress(75); }, 2200);
    const timer3 = setTimeout(() => { setStep(4); setProgress(100); }, 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0F4C3A] mx-auto flex items-center justify-center font-bold shadow-xs">
          <Sparkles className="w-6 h-6 text-[#9E7C3B]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">AI 재고 최적화 전략 생성</h1>
        <p className="text-xs text-slate-500">
          {targetType === 'BUNDLE'
            ? `${bundleCode ?? 'BND-20260806-001'} 번들 초안의 구성품 재고와 가격·채널 조건을 분석해 판매전략을 생성합니다.`
            : selectedProduct && selectedSku
            ? `${selectedProduct.name} · ${selectedSku.optionLabel} SKU의 판매처별 재고와 수요를 비교해 재할당·RT 우선 전략을 생성합니다.`
            : targetProducts.length > 0
            ? `선택된 ${targetProducts.length}개 위험 재고 품목에 대해 과거 3년 반응 데이터와 폐기 회피 비용을 시뮬레이션합니다.`
            : '판매처별 과잉·부족 재고를 분석하고 할인 전에 이동 가능한 재고를 먼저 찾습니다.'}
        </p>
      </div>

      {selectedProduct && selectedSku && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-xs font-bold text-[#0F4C3A]">선택 SKU</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold text-slate-900">[{selectedProduct.affiliate}] {selectedProduct.name}</p><p className="mt-1 text-xs text-slate-600">{selectedSku.optionLabel} · {selectedSku.code}</p></div>
            <div className="text-right text-xs"><p className="font-bold text-slate-900">재고 {selectedSku.availableStock.toLocaleString()}{selectedSku.unit}</p><p className="mt-1 text-slate-500">판매가 ₩{selectedSku.sellingPrice.toLocaleString()}</p></div>
          </div>
        </div>
      )}

      {targetType === 'BUNDLE' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
          <p className="text-xs font-bold text-violet-800">선택 번들 초안</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900">그리팅 추천 번들 초안</p><p className="mt-1 font-mono text-xs text-slate-600">{bundleCode ?? 'BND-20260806-001'} · 구성 SKU 2개</p></div><div className="text-right text-xs"><p className="font-bold text-slate-900">최대 구성 45세트</p><p className="mt-1 text-slate-500">번들 판매가 ₩49,900</p></div></div>
        </div>
      )}

      {recommendation && source && destination && selectedSku && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-sky-800">우선 검토 후보 · {recommendation.mode === 'REALLOCATION' ? '재고 재할당' : 'RT 이동'}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{source.channelName} → {destination.channelName}</p>
              <p className="mt-1 text-xs text-slate-600">{recommendation.reason}</p>
            </div>
            <div className="rounded-lg bg-white px-4 py-2 text-right shadow-xs">
              <p className="text-[10px] text-slate-500">추천 수량</p>
              <p className="text-lg font-black text-sky-800">{recommendation.quantity}{selectedSku.unit}</p>
            </div>
          </div>
        </div>
      )}

      {targetProducts.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2">
          <p className="text-xs font-bold text-[#0F4C3A]">전략 수립 대상 수신 품목 ({targetProducts.length}개)</p>
          <div className="flex flex-wrap gap-2">
            {targetProducts.map((p) => (
              <span key={p.id} className="px-2.5 py-1 bg-white border border-emerald-300 text-slate-800 rounded-lg text-xs font-semibold shadow-2xs">
                [{p.company}] {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-700">
          <span>알고리즘 연산 진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F4C3A] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border transition-all ${step >= 1 ? 'bg-white border-[#0F4C3A] shadow-md' : 'bg-slate-50 border-slate-200'}`}>
          <Database className="w-5 h-5 text-[#0F4C3A] mb-2" />
          <p className="text-xs font-bold text-slate-900">1단계: 채널 현황 분석</p>
          <p className="text-[11px] text-slate-500 mt-1">판매처별 재고·판매속도·예상 수요 비교</p>
          {step === 1 && <Loader2 className="w-4 h-4 text-[#0F4C3A] animate-spin mt-2" />}
          {step > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-2" />}
        </div>

        <div className={`p-4 rounded-xl border transition-all ${step >= 2 ? 'bg-white border-[#0F4C3A] shadow-md' : 'bg-slate-50 border-slate-200'}`}>
          <Calculator className="w-5 h-5 text-[#0F4C3A] mb-2" />
          <p className="text-xs font-bold text-slate-900">2단계: 재할당 검증</p>
          <p className="text-[11px] text-slate-500 mt-1">같은 센터 내 채널 할당량 전환 가능성 확인</p>
          {step === 2 && <Loader2 className="w-4 h-4 text-[#0F4C3A] animate-spin mt-2" />}
          {step > 2 && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-2" />}
        </div>

        <div className={`p-4 rounded-xl border transition-all ${step >= 3 ? 'bg-white border-[#0F4C3A] shadow-md' : 'bg-slate-50 border-slate-200'}`}>
          <Truck className="w-5 h-5 text-[#0F4C3A] mb-2" />
          <p className="text-xs font-bold text-slate-900">3단계: RT 검증</p>
          <p className="text-[11px] text-slate-500 mt-1">센터·점포 간 이동비와 리드타임 확인</p>
          {step === 3 && <Loader2 className="w-4 h-4 text-[#0F4C3A] animate-spin mt-2" />}
          {step > 3 && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-2" />}
        </div>

        <div className={`p-4 rounded-xl border transition-all ${step >= 4 ? 'bg-white border-[#0F4C3A] shadow-md' : 'bg-slate-50 border-slate-200'}`}>
          <ShieldCheck className="w-5 h-5 text-[#0F4C3A] mb-2" />
          <p className="text-xs font-bold text-slate-900">4단계: 대안 생성</p>
          <p className="text-[11px] text-slate-500 mt-1">이동이 어렵다면 채널 전환·할인 대안 생성</p>
          {step === 4 && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-2" />}
        </div>
      </div>

      {step === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
          <h3 className="font-bold text-slate-900 text-base">AI 시뮬레이션 및 최적 시나리오 생성이 완료되었습니다!</h3>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => router.push(`/strategy/optimize${nextQuery}`)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F4C3A] hover:bg-[#0B392B] text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <span>추천 전략 비교·시뮬레이션 보기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrategyGeneratePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">파이프라인 로딩 중...</div>}>
        <StrategyGenerateContent />
      </Suspense>
    </AppLayout>
  );
}
