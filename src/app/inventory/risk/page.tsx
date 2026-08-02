'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';

function RiskRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inventory/all?tab=risk');
  }, [router]);

  return (
    <div className="p-12 text-center text-xs text-slate-500 font-medium">
      그룹 위험 SKU 관제 화면으로 이동 중입니다...
    </div>
  );
}

export default function RiskInventoryPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">로딩 중...</div>}>
        <RiskRedirectContent />
      </Suspense>
    </AppLayout>
  );
}
