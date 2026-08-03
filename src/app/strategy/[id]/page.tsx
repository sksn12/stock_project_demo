import { Suspense } from "react";
import StrategyDetailClient from "./strategy-detail-client";

export function generateStaticParams() {
  return [
    { id: "CASE-2026-001" },
    { id: "CASE-2026-002" },
    { id: "OPT-PROFIT-1" },
    { id: "OPT-PROFIT-2" },
    { id: "OPT-PROFIT-3" },
    { id: "OPT-FAST-1" },
    { id: "OPT-FAST-2" },
    { id: "OPT-REV-1" },
    { id: "OPT-REV-2" },
  ];
}

export default function StrategyDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">AI 전략 비교 화면을 불러오는 중...</div>}>
      <StrategyDetailClient />
    </Suspense>
  );
}
