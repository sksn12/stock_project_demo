'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { enqueueAsyncStrategy, type AsyncStrategyRequest } from '@/lib/async-strategy-generation';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { MOCK_INVENTORY_ITEMS } from '@/lib/mock-data';
import { CheckCircle2, ListChecks, Loader2 } from 'lucide-react';

function StrategyGenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawItems = searchParams.get('items');
  const productId = searchParams.get('productId');
  const skuId = searchParams.get('skuId');
  const channelId = searchParams.get('channelId');
  const targetType = searchParams.get('targetType') === 'BUNDLE' ? 'BUNDLE' : 'SKU';
  const bundleCode = searchParams.get('bundleCode') ?? 'BND-20260806-001';

  useEffect(() => {
    const selectedIds = rawItems ? rawItems.split(',').filter(Boolean) : [];
    const targetProducts = MOCK_INVENTORY_ITEMS.filter((item) => selectedIds.includes(item.id));
    const selectedProduct = INVENTORY_PRODUCTS.find((product) => product.id === productId);
    const selectedSku = selectedProduct?.skus.find((sku) => sku.id === skuId);
    const optimizeQuery = new URLSearchParams();
    let requestKey: string;
    let request: AsyncStrategyRequest;

    if (targetType === 'BUNDLE') {
      requestKey = `BUNDLE-${bundleCode}`;
      optimizeQuery.set('targetType', 'BUNDLE');
      optimizeQuery.set('bundleCode', bundleCode);
      request = {
        requestKey,
        type: '번들' as const,
        title: '그리팅 추천 번들 AI 판매전략',
        affiliate: '현대그린푸드',
        category: '번들',
        productName: `${bundleCode} · 구성 SKU 2개`,
        href: `/strategy/optimize?${optimizeQuery.toString()}`,
      };
    } else if (selectedProduct && selectedSku) {
      requestKey = `SKU-${selectedSku.id}-${channelId ?? 'ALL'}`;
      optimizeQuery.set('productId', selectedProduct.id);
      optimizeQuery.set('skuId', selectedSku.id);
      if (channelId) optimizeQuery.set('channelId', channelId);
      request = {
        requestKey,
        type: '개별' as const,
        title: `${selectedSku.optionLabel} AI 판매전략`,
        affiliate: selectedProduct.affiliate,
        category: selectedProduct.category,
        productName: `${selectedProduct.name} · ${selectedSku.optionLabel}`,
        href: `/strategy/optimize?${optimizeQuery.toString()}`,
      };
    } else {
      requestKey = `ITEMS-${selectedIds.sort().join('-') || 'GENERAL'}`;
      request = {
        requestKey,
        type: '개별' as const,
        title: '위험재고 AI 판매전략',
        affiliate: targetProducts[0]?.company ?? '현대그린푸드',
        category: targetProducts[0]?.category ?? '통합재고',
        productName: targetProducts.length
          ? `${targetProducts[0].name}${targetProducts.length > 1 ? ` 외 ${targetProducts.length - 1}건` : ''}`
          : '통합 재고 대상 품목',
        href: '/strategy/optimize',
      };
    }

    enqueueAsyncStrategy(request);
    const redirectTimer = window.setTimeout(() => router.replace('/strategy/history'), 700);
    return () => window.clearTimeout(redirectTimer);
  }, [bundleCode, channelId, productId, rawItems, router, skuId, targetType]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
      <section className="w-full rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0F4C3A]">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-black text-slate-950">AI 전략 생성 요청이 접수되었습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          전략 생성은 백그라운드에서 처리됩니다. 생성 상태와 완료된 결과는
          <strong className="text-[#0F4C3A]"> AI 전략 및 시뮬레이션</strong> 목록에서 확인할 수 있습니다.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#0F4C3A]" />
          <ListChecks className="h-4 w-4 text-slate-400" />
          전략 목록으로 이동 중
        </div>
      </section>
    </div>
  );
}

export default function StrategyGeneratePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">전략 생성 요청을 접수하고 있습니다.</div>}>
        <StrategyGenerateContent />
      </Suspense>
    </AppLayout>
  );
}
