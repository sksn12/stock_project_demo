"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Globe2,
  Info,
  Layers3,
  MapPin,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { InventoryProductDetail } from "@/components/inventory/inventory-product-detail";
import { InventoryBundleModal } from "@/components/inventory/inventory-bundle-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BUNDLE_STATUS_META,
  INITIAL_BUNDLE_INVENTORY,
  type BundleInventoryItem,
  type BundleInventoryRecord,
  type BundleInventoryStatus,
} from "@/lib/bundle-inventory-data";
import {
  INVENTORY_PRODUCTS,
  InventoryProduct,
  InventorySku,
  RISK_META,
  SkuRiskStatus,
  SKU_OPERATION_DATA,
} from "@/lib/inventory-control-data";
import {
  CHANNEL_TYPE_META,
  ChannelInventory,
  GREENFOOD_CHANNEL_INVENTORY,
  INVENTORY_LOCATION_META,
  InventoryLocationType,
  getChannelInventoryBySku,
  getChannelRiskStatus,
  getInventoryAllocationLabel,
  getInventoryLocationName,
  getInventoryLocationType,
} from "@/lib/greenfood-channel-data";

type ScopeFilter = "ALL" | "ONLINE" | "OFFLINE" | "CENTER";
type LocationFilter = "ALL" | InventoryLocationType;
type InventoryView = "ALL" | "BUNDLE";

interface InventoryListItem {
  product: InventoryProduct;
  sku: InventorySku;
  channel: ChannelInventory;
}

const GREENFOOD_PRODUCTS = INVENTORY_PRODUCTS.filter(
  (product) => product.affiliate === "현대그린푸드",
);

function SkuThumbnail({ src, alt }: { src: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
      {imageFailed ? (
        <Boxes className="h-4 w-4" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  );
}

function scopeIcon(scope: ScopeFilter | "CENTER") {
  if (scope === "ONLINE") return <Globe2 className="h-4 w-4" />;
  if (scope === "OFFLINE") return <Store className="h-4 w-4" />;
  return <Database className="h-4 w-4" />;
}

function UnifiedInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inventoryView, setInventoryView] = useState<InventoryView>(() =>
    searchParams.get("view") === "bundle" ? "BUNDLE" : "ALL",
  );
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [locationScope, setLocationScope] = useState<LocationFilter>("ALL");
  const [categoryLarge, setCategoryLarge] = useState("ALL");
  const [categoryMedium, setCategoryMedium] = useState("ALL");
  const [categorySmall, setCategorySmall] = useState("ALL");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [region, setRegion] = useState("ALL");
  const [salesPoint, setSalesPoint] = useState("ALL");
  const [stockLocation, setStockLocation] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState<"ALL" | SkuRiskStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryListItem | null>(
    null,
  );
  const [selectedBundleItems, setSelectedBundleItems] = useState<
    InventoryListItem[]
  >([]);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [savedBundleCode, setSavedBundleCode] = useState("");
  const [bundleInventoryRecords, setBundleInventoryRecords] = useState<
    BundleInventoryRecord[]
  >(INITIAL_BUNDLE_INVENTORY);
  const [syncing, setSyncing] = useState(false);

  const changeInventoryView = (view: InventoryView) => {
    setInventoryView(view);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view === "BUNDLE" ? "bundle" : "all");
    router.replace(`/inventory/all?${params.toString()}`, { scroll: false });
  };

  const inventoryRows = useMemo(() => GREENFOOD_CHANNEL_INVENTORY, []);
  const regions = useMemo(
    () =>
      [
        ...new Set(
          inventoryRows
            .map((item) => item.region)
            .filter((item) => item !== "전국"),
        ),
      ].sort(),
    [inventoryRows],
  );
  const salesPoints = useMemo(
    () =>
      [
        ...new Set(
          inventoryRows
            .filter((item) => scope === "ALL" || item.channelType === scope)
            .map((item) => item.channelName),
        ),
      ].sort(),
    [inventoryRows, scope],
  );
  const stockLocations = useMemo(
    () =>
      [
        ...new Set(
          inventoryRows
            .filter(
              (item) =>
                locationScope === "ALL" ||
                getInventoryLocationType(item) === locationScope,
            )
            .map(getInventoryLocationName),
        ),
      ].sort(),
    [inventoryRows, locationScope],
  );
  const skuPairs = useMemo(
    () =>
      GREENFOOD_PRODUCTS.flatMap((product) =>
        product.skus.map((sku) => ({ product, sku })),
      ),
    [],
  );
  const categoryRows = useMemo(
    () =>
      skuPairs.map(({ product, sku }) => {
        const [large = "기타", medium = "기타"] = product.category.split("/");
        const small = sku.optionLabel.split("·")[0].trim();
        return { large, medium, small };
      }),
    [skuPairs],
  );
  const largeCategories = useMemo(
    () => [...new Set(categoryRows.map((row) => row.large))].sort(),
    [categoryRows],
  );
  const mediumCategories = useMemo(
    () =>
      [
        ...new Set(
          categoryRows
            .filter(
              (row) => categoryLarge === "ALL" || row.large === categoryLarge,
            )
            .map((row) => row.medium),
        ),
      ].sort(),
    [categoryLarge, categoryRows],
  );
  const smallCategories = useMemo(
    () =>
      [
        ...new Set(
          categoryRows
            .filter(
              (row) =>
                (categoryLarge === "ALL" || row.large === categoryLarge) &&
                (categoryMedium === "ALL" || row.medium === categoryMedium),
            )
            .map((row) => row.small),
        ),
      ].sort(),
    [categoryLarge, categoryMedium, categoryRows],
  );

  const listItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base: InventoryListItem[] = skuPairs.flatMap(({ product, sku }) =>
      getChannelInventoryBySku(sku.id)
        .filter(
          (row) =>
            (scope === "ALL" || row.channelType === scope) &&
            (locationScope === "ALL" ||
              getInventoryLocationType(row) === locationScope),
        )
        .map((channel) => ({ product, sku, channel })),
    );

    return base
      .filter(({ product, sku, channel }) => {
        const [large = "기타", medium = "기타"] = product.category.split("/");
        const small = sku.optionLabel.split("·")[0].trim();
        if (categoryLarge !== "ALL" && large !== categoryLarge) return false;
        if (categoryMedium !== "ALL" && medium !== categoryMedium) return false;
        if (categorySmall !== "ALL" && small !== categorySmall) return false;
        if (region !== "ALL" && channel.region !== region) return false;
        if (salesPoint !== "ALL" && channel.channelName !== salesPoint)
          return false;
        if (
          stockLocation !== "ALL" &&
          getInventoryLocationName(channel) !== stockLocation
        )
          return false;
        if (
          riskFilter !== "ALL" &&
          getChannelRiskStatus(channel, sku) !== riskFilter
        )
          return false;
        if (!normalizedQuery) return true;
        return [
          product.name,
          product.productCode,
          product.category,
          sku.code,
          sku.optionLabel,
          ...Object.values(sku.options),
          channel.channelName,
          getInventoryLocationName(channel),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const rank: Record<SkuRiskStatus, number> = {
          CRITICAL: 4,
          WARNING: 3,
          CAUTION: 2,
          SAFE: 1,
        };
        return (
          rank[getChannelRiskStatus(right.channel, right.sku)] -
            rank[getChannelRiskStatus(left.channel, left.sku)] ||
          right.channel.stock - left.channel.stock
        );
      });
  }, [
    categoryLarge,
    categoryMedium,
    categorySmall,
    locationScope,
    query,
    region,
    riskFilter,
    salesPoint,
    scope,
    skuPairs,
    stockLocation,
  ]);

  const locationCards = useMemo(() => {
    const scopes: LocationFilter[] = ["ALL", "CENTER", "STORE"];
    return scopes.map((item) => {
      const rows =
        item === "ALL"
          ? inventoryRows
          : inventoryRows.filter(
              (row) => getInventoryLocationType(row) === item,
            );
      return {
        key: item,
        label:
          item === "ALL"
            ? "전체 재고 위치"
            : item === "CENTER"
              ? "물류센터"
              : "오프라인 매장",
        description:
          item === "ALL"
            ? "물류센터·매장 실물재고"
            : item === "CENTER"
              ? "온라인 할당·공용재고"
              : "점포 직접 보유재고",
        stock: rows.reduce((sum, row) => sum + row.stock, 0),
        available: rows.reduce((sum, row) => sum + row.availableStock, 0),
        outbound: rows.reduce((sum, row) => sum + row.outboundScheduled, 0),
        risky: rows.filter((row) => {
          const sku = skuPairs.find((pair) => pair.sku.id === row.skuId)?.sku;
          if (!sku) return false;
          const status = getChannelRiskStatus(row, sku);
          return status === "CRITICAL" || status === "WARNING";
        }).length,
      };
    });
  }, [inventoryRows, skuPairs]);

  const resetFilters = () => {
    setScope("ALL");
    setLocationScope("ALL");
    setCategoryLarge("ALL");
    setCategoryMedium("ALL");
    setCategorySmall("ALL");
    setCategoryPickerOpen(false);
    setRegion("ALL");
    setSalesPoint("ALL");
    setStockLocation("ALL");
    setRiskFilter("ALL");
    setQuery("");
  };

  const runMockSync = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 850);
  };

  const getRowKey = (item: InventoryListItem) =>
    `${item.sku.id}-${item.channel.id}`;
  const isBundleSelected = (item: InventoryListItem) =>
    selectedBundleItems.some(
      (selected) => getRowKey(selected) === getRowKey(item),
    );
  const hasSameSkuSelected = (item: InventoryListItem) =>
    selectedBundleItems.some(
      (selected) =>
        selected.sku.id === item.sku.id &&
        getRowKey(selected) !== getRowKey(item),
    );

  const toggleBundleItem = (item: InventoryListItem) => {
    const selected = isBundleSelected(item);
    if (selected) {
      setSelectedBundleItems((current) =>
        current.filter(
          (selectedItem) => getRowKey(selectedItem) !== getRowKey(item),
        ),
      );
      setSavedBundleCode("");
      return;
    }
    if (
      selectedBundleItems.length >= 5 ||
      hasSameSkuSelected(item) ||
      item.channel.availableStock <= 0
    )
      return;
    setSelectedBundleItems((current) => [...current, item]);
    setSavedBundleCode("");
  };

  const openBundleSkuDetail = (bundleItem: BundleInventoryItem) => {
    const pair = skuPairs.find(({ sku }) => sku.id === bundleItem.skuId);
    if (!pair) return;
    const channelRows = getChannelInventoryBySku(bundleItem.skuId);
    const channel =
      channelRows.find((item) => item.id === bundleItem.channelId) ??
      channelRows.find((item) => item.channelName === bundleItem.channelName) ??
      channelRows[0];
    if (!channel) return;
    setSelectedItem({ product: pair.product, sku: pair.sku, channel });
  };

  return (
    <div className="inventory-accessible space-y-5 pb-10">
      <section className="space-y-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F7F4] text-[#0F4C3A]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  현대그린푸드 재고 네트워크
                </h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  R1 냉동 완제품
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
                판매 채널의 수요와 물류센터·매장의 실제 보관재고를 분리해 보고,
                추가 생산 전에 보충·재할당·RT 가능성을 확인합니다.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500">
              최근 통합 동기화{" "}
              <strong className="ml-1 text-slate-900">2026.08.06 05:00</strong>
            </div>
            <button
              type="button"
              onClick={runMockSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "동기화 중" : "데이터 동기화"}
            </button>
          </div>
        </div>

        <Tabs
          value={inventoryView}
          onValueChange={(value) => changeInventoryView(value as InventoryView)}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:w-[560px]">
            <TabsTrigger
              value="ALL"
              className="gap-2 rounded-xl px-4 py-3 text-xs font-black data-[state=active]:bg-[#0F4C3A] data-[state=active]:text-white"
            >
              <Database className="h-4 w-4" />
              전체 통합 재고 조회
            </TabsTrigger>
            <TabsTrigger
              value="BUNDLE"
              className="gap-2 rounded-xl px-4 py-3 text-xs font-black data-[state=active]:bg-[#0F4C3A] data-[state=active]:text-white"
            >
              <Layers3 className="h-4 w-4" />
              번들 구성 재고
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] ${inventoryView === "BUNDLE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {bundleInventoryRecords.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {inventoryView === "ALL" && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {locationCards.map((item) => {
                const isActive = locationScope === item.key;
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => {
                      setLocationScope(item.key);
                      setStockLocation("ALL");
                    }}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isActive ? "border-[#0F4C3A] bg-[#F0F7F4] ring-2 ring-[#0F4C3A]/10" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-[#0F4C3A] text-white" : "bg-slate-100 text-slate-500"}`}
                        >
                          {item.key === "STORE" ? (
                            <Store className="h-4 w-4" />
                          ) : item.key === "CENTER" ? (
                            <Warehouse className="h-4 w-4" />
                          ) : (
                            <Database className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-950">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="rounded-full bg-[#0F4C3A] px-2 py-1 text-[9px] font-bold text-white">
                          선택됨
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-4 divide-x divide-slate-200/70 rounded-xl bg-white/70 py-2.5 text-center">
                      <div>
                        <p className="text-[9px] text-slate-400">현재고</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-slate-950">
                          {item.stock.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">판매 가능</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">
                          {item.available.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">출고 예정</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-slate-700">
                          {item.outbound.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">위험·주의</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-rose-600">
                          {item.risky}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {inventoryView === "ALL" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
              <div className="relative min-w-[240px] flex-1 xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="상품명, SKU, 판매처, 재고 위치 검색"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none transition focus:border-[#0F4C3A] focus:ring-2 focus:ring-[#0F4C3A]/10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="검색어 지우기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <label className="relative w-[145px] shrink-0">
                <span className="sr-only">판매 채널</span>
                <select
                  value={scope}
                  onChange={(event) => {
                    setScope(event.target.value as ScopeFilter);
                    setSalesPoint("ALL");
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
                >
                  <option value="ALL">전체 판매채널</option>
                  <option value="ONLINE">온라인</option>
                  <option value="OFFLINE">오프라인</option>
                  <option value="CENTER">공용 미할당</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </label>
              <FilterSelect
                label="지역"
                value={region}
                onChange={setRegion}
                options={regions}
                allLabel="전체 지역"
              />
              <FilterSelect
                label="판매처"
                value={salesPoint}
                onChange={setSalesPoint}
                options={salesPoints}
                allLabel="전체 판매처"
                width="w-[210px]"
              />
              <FilterSelect
                label="재고 위치"
                value={stockLocation}
                onChange={setStockLocation}
                options={stockLocations}
                allLabel="전체 재고 위치"
                width="w-[210px]"
              />
              <button
                type="button"
                onClick={() => setCategoryPickerOpen(true)}
                className={`inline-flex h-10 min-w-[220px] max-w-[300px] items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left text-xs font-bold transition ${categoryLarge === "ALL" ? "border-slate-300 text-slate-700 hover:border-[#0F4C3A]" : "border-emerald-300 text-[#0F4C3A] ring-1 ring-emerald-100"}`}
              >
                <span className="truncate">
                  {categoryLarge === "ALL"
                    ? "전체 카테고리"
                    : [
                        categoryLarge,
                        categoryMedium !== "ALL" ? categoryMedium : null,
                        categorySmall !== "ALL" ? categorySmall : null,
                      ]
                        .filter(Boolean)
                        .join(" › ")}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              </button>
              <label className="relative shrink-0">
                <span className="sr-only">위험재고 등급 선택</span>
                <select
                  value={riskFilter}
                  onChange={(event) =>
                    setRiskFilter(event.target.value as "ALL" | SkuRiskStatus)
                  }
                  className="h-10 appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
                >
                  <option value="ALL">전체 위험등급</option>
                  <option value="CRITICAL">위험</option>
                  <option value="WARNING">주의</option>
                  <option value="CAUTION">보통</option>
                  <option value="SAFE">양호</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                초기화
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <p className="whitespace-nowrap text-slate-500">
                검색 결과{" "}
                <strong className="text-slate-900">{listItems.length}건</strong>{" "}
                · SKU와 재고 위치 조합을 조회합니다.
              </p>
              {categoryLarge !== "ALL" && (
                <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                  <span>{categoryLarge}</span>
                  {categoryMedium !== "ALL" && (
                    <>
                      <span className="text-emerald-500">›</span>
                      <span>{categoryMedium}</span>
                    </>
                  )}
                  {categorySmall !== "ALL" && (
                    <>
                      <span className="text-emerald-500">›</span>
                      <span>{categorySmall}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="hidden items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-400 md:flex">
              <Clock3 className="h-3.5 w-3.5" />
              재고 위치별 마지막 정상 동기화 기준
            </p>
          </div>

          {selectedBundleItems.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F4C3A] text-white">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-950">
                    {selectedBundleItems.length}개 SKU 선택됨{" "}
                    <span className="font-medium text-slate-500">
                      · 최대 5개
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    판매 가능 재고 합계{" "}
                    {selectedBundleItems
                      .reduce(
                        (sum, item) => sum + item.channel.availableStock,
                        0,
                      )
                      .toLocaleString()}
                    개
                    {selectedBundleItems.length < 2
                      ? " · 번들 구성을 위해 1개 이상 더 선택하세요."
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedBundleCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setBundleOpen(false);
                      changeInventoryView("BUNDLE");
                    }}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-700 hover:border-[#0F4C3A]"
                  >
                    저장 완료 {savedBundleCode} · 번들 재고 보기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBundleItems([]);
                    setSavedBundleCode("");
                  }}
                  className="rounded-xl px-3 py-2 text-[10px] font-bold text-slate-500 hover:bg-white"
                >
                  선택 해제
                </button>
                <button
                  type="button"
                  onClick={() => setBundleOpen(true)}
                  disabled={selectedBundleItems.length < 2}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B392B] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600"
                >
                  <Layers3 className="h-4 w-4" />
                  번들 구성
                </button>
              </div>
            </div>
          )}

          {listItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left text-xs">
                <thead className="whitespace-nowrap bg-slate-50 text-[11px] font-extrabold text-slate-600">
                  <tr>
                    <th className="w-14 px-5 py-3 text-center">선택</th>
                    <th className="px-4 py-3">판매 채널</th>
                    <th className="px-4 py-3">실제 재고 위치</th>
                    <th className="px-4 py-3">상품·SKU</th>
                    <th className="px-4 py-3 text-right">현재고</th>
                    <th className="px-4 py-3 text-right">판매 가능</th>
                    <th className="px-4 py-3 text-right">출고 예정</th>
                    <th className="px-4 py-3 text-right">안전재고</th>
                    <th className="px-4 py-3">위험재고 등급</th>
                    <th className="px-5 py-3 text-right">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {listItems.map(({ product, sku, channel }) => {
                    const risk = RISK_META[getChannelRiskStatus(channel, sku)];
                    const rowKey = `${sku.id}-${channel.id}`;
                    const item = { product, sku, channel };
                    const bundleSelected = isBundleSelected(item);
                    const bundleDisabled =
                      !bundleSelected &&
                      (selectedBundleItems.length >= 5 ||
                        hasSameSkuSelected(item) ||
                        channel.availableStock <= 0);
                    return (
                      <tr
                        key={rowKey}
                        tabIndex={0}
                        role="button"
                        onClick={() =>
                          setSelectedItem({ product, sku, channel })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ")
                            setSelectedItem({ product, sku, channel });
                        }}
                        className={`group cursor-pointer border-b border-slate-100 outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60 ${bundleSelected ? "bg-emerald-50/70" : ""}`}
                      >
                        <td
                          className="px-5 py-3.5 text-center"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={bundleSelected}
                            disabled={bundleDisabled}
                            onChange={() => toggleBundleItem(item)}
                            aria-label={`${sku.optionLabel} ${channel.channelName} 번들 선택`}
                            title={
                              hasSameSkuSelected(item) && !bundleSelected
                                ? "동일 SKU의 다른 판매처 재고가 이미 선택되었습니다."
                                : selectedBundleItems.length >= 5 &&
                                    !bundleSelected
                                  ? "번들은 최대 5개 SKU까지 선택할 수 있습니다."
                                  : undefined
                            }
                            className="h-4 w-4 cursor-pointer accent-[#0F4C3A] disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${CHANNEL_TYPE_META[channel.channelType].className}`}
                            >
                              {scopeIcon(channel.channelType)}
                              {CHANNEL_TYPE_META[channel.channelType].label}
                            </span>
                            <p className="mt-1.5 max-w-[190px] font-bold text-slate-800">
                              {getInventoryAllocationLabel(channel)}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {channel.channelName}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${INVENTORY_LOCATION_META[getInventoryLocationType(channel)].className}`}
                            >
                              {getInventoryLocationType(channel) ===
                              "CENTER" ? (
                                <Warehouse className="h-3.5 w-3.5" />
                              ) : (
                                <Store className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div>
                              <p className="font-bold text-slate-800">
                                {getInventoryLocationName(channel)}
                              </p>
                              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                <MapPin className="h-3 w-3" />
                                {channel.region} ·{" "}
                                {
                                  INVENTORY_LOCATION_META[
                                    getInventoryLocationType(channel)
                                  ].label
                                }
                              </p>
                              {channel.channelType === "OFFLINE" && (
                                <p className="mt-1 text-[9px] text-indigo-500">
                                  보충: {channel.fulfillmentCenter}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <SkuThumbnail
                              src={
                                SKU_OPERATION_DATA[sku.id]?.imageUrl ??
                                product.imageUrl
                              }
                              alt={sku.optionLabel}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] font-extrabold text-slate-950">
                                {sku.optionLabel}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-slate-600">
                                {product.name}
                              </p>
                              <p className="mt-1 font-mono text-[10px] text-slate-400">
                                {sku.code} · {product.category}
                              </p>
                              <div className="mt-1.5 flex gap-1">
                                {Object.entries(sku.options)
                                  .slice(0, 3)
                                  .map(([key, value]) => (
                                    <span
                                      key={key}
                                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500"
                                    >
                                      {key} {value}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-900">
                          {channel.stock.toLocaleString()}
                          {sku.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">
                          {channel.availableStock.toLocaleString()}
                          {sku.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-500">
                          {channel.outboundScheduled.toLocaleString()}
                          {sku.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-600">
                          {channel.safetyStock.toLocaleString()}
                          {sku.unit}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusWithTooltip
                            label={risk.label}
                            className={risk.className}
                            tooltip="판매처별 판매속도, 14일 예상수요, 안전재고, 재고보유일수와 소비기한을 기준으로 산정한 시연용 위험재고 등급입니다."
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C3A]">
                            재고 상세
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-14 text-center">
              <Search className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                조건에 맞는 재고가 없습니다.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-xs font-bold text-[#0F4C3A]"
              >
                필터 초기화
              </button>
            </div>
          )}
        </section>
      ) : (
        <BundleInventoryView
          records={bundleInventoryRecords}
          onCreateBundle={() => changeInventoryView("ALL")}
          onOpenSkuDetail={openBundleSkuDetail}
        />
      )}

      <InventoryProductDetail
        product={selectedItem?.product ?? null}
        initialSkuId={selectedItem?.sku.id}
        initialChannelId={selectedItem?.channel?.id}
        onClose={() => setSelectedItem(null)}
      />
      {bundleOpen && (
        <InventoryBundleModal
          selectedItems={selectedBundleItems}
          onClose={() => setBundleOpen(false)}
          onSaved={(bundle) => {
            setSavedBundleCode(bundle.bundleCode);
            setBundleInventoryRecords((current) => [
              bundle,
              ...current.filter(
                (item) => item.bundleCode !== bundle.bundleCode,
              ),
            ]);
          }}
        />
      )}
      {categoryPickerOpen && (
        <CategoryDrilldownModal
          categoryRows={categoryRows}
          largeOptions={largeCategories}
          mediumOptions={mediumCategories}
          smallOptions={smallCategories}
          large={categoryLarge}
          medium={categoryMedium}
          small={categorySmall}
          onLargeChange={(value) => {
            setCategoryLarge(value);
            setCategoryMedium("ALL");
            setCategorySmall("ALL");
          }}
          onMediumChange={(value) => {
            setCategoryMedium(value);
            setCategorySmall("ALL");
          }}
          onSmallChange={setCategorySmall}
          onReset={() => {
            setCategoryLarge("ALL");
            setCategoryMedium("ALL");
            setCategorySmall("ALL");
          }}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </div>
  );
}

function formatBundleCurrency(value: number) {
  return `${value < 0 ? "-" : ""}₩${Math.abs(Math.round(value)).toLocaleString("ko-KR")}`;
}

function BundleInventoryView({
  records,
  onCreateBundle,
  onOpenSkuDetail,
}: {
  records: BundleInventoryRecord[];
  onCreateBundle: () => void;
  onOpenSkuDetail: (item: BundleInventoryItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | BundleInventoryStatus>("ALL");
  const [selectedBundle, setSelectedBundle] =
    useState<BundleInventoryRecord | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecords = records.filter((record) => {
    if (status !== "ALL" && record.status !== status) return false;
    if (!normalizedQuery) return true;
    return [
      record.bundleCode,
      record.bundleName,
      record.fulfillmentCenter,
      ...record.items.flatMap((item) => [
        item.skuCode,
        item.productName,
        item.optionLabel,
      ]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const readyCount = records.filter(
    (record) => record.status === "READY",
  ).length;
  const lowStockCount = records.filter(
    (record) => record.status === "LOW_STOCK" || record.status === "SOLD_OUT",
  ).length;
  const totalAvailable = records.reduce(
    (sum, record) => sum + record.availableBundleStock,
    0,
  );

  return (
    <section className="space-y-4" aria-label="번들 구성 재고">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BundleSummaryCard
          icon={<Layers3 className="h-4 w-4" />}
          label="전체 번들"
          value={`${records.length}개`}
          description="초안 포함 구성 상품"
        />
        <BundleSummaryCard
          icon={<PackageOpen className="h-4 w-4" />}
          label="판매 가능 번들"
          value={`${readyCount}개`}
          description="즉시 운영 가능한 번들"
          tone="emerald"
        />
        <BundleSummaryCard
          icon={<Boxes className="h-4 w-4" />}
          label="총 가용 세트"
          value={`${totalAvailable.toLocaleString()}세트`}
          description="구성 SKU 최소 재고 기준"
        />
        <BundleSummaryCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="재고 부족 번들"
          value={`${lowStockCount}개`}
          description="보충 또는 구성 조정 필요"
          tone="amber"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-extrabold text-slate-900">
              번들 구성 재고 현황
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              구성 SKU의 가용재고를 기준으로 실제 판매 가능한 번들 세트 수를
              조회합니다.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="번들명, 번들 코드, 구성 SKU 검색"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none focus:border-[#0F4C3A] focus:ring-2 focus:ring-[#0F4C3A]/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="번들 검색어 지우기"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <label className="relative w-[150px]">
              <span className="sr-only">번들 상태</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "ALL" | BundleInventoryStatus)
                }
                className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A]"
              >
                <option value="ALL">전체 상태</option>
                <option value="DRAFT">초안</option>
                <option value="READY">판매 가능</option>
                <option value="LOW_STOCK">재고 부족</option>
                <option value="SOLD_OUT">품절</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>
            <button
              type="button"
              onClick={onCreateBundle}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F4C3A] px-4 text-xs font-bold text-white hover:bg-[#0B392B]"
            >
              <Plus className="h-4 w-4" />새 번들 구성
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
          <p>
            검색 결과{" "}
            <strong className="text-slate-900">
              {filteredRecords.length}건
            </strong>
          </p>
          <p className="hidden text-[10px] md:block">
            가용 세트는 구성품별 가용재고 ÷ 세트당 수량의 최솟값입니다.
          </p>
        </div>

        {filteredRecords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="whitespace-nowrap bg-slate-50 text-[11px] font-extrabold text-slate-600">
                <tr>
                  <th className="px-5 py-3">번들 상품</th>
                  <th className="px-4 py-3">구성 SKU</th>
                  <th className="px-4 py-3">운영 물류센터</th>
                  <th className="px-4 py-3 text-right">가용 세트</th>
                  <th className="px-4 py-3 text-right">번들 판매가</th>
                  <th className="px-4 py-3 text-right">공헌이익률</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-5 py-3 text-right">기능</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const meta = BUNDLE_STATUS_META[record.status];
                  return (
                    <tr
                      key={record.bundleCode}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedBundle(record)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ")
                          setSelectedBundle(record);
                      }}
                      className="cursor-pointer border-b border-slate-100 outline-none transition hover:bg-emerald-50/40 focus:bg-emerald-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4C3A]">
                            <Layers3 className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-950">
                              {record.bundleName}
                            </p>
                            <p className="mt-1 font-mono text-[10px] text-slate-400">
                              {record.bundleCode}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-400">
                              {record.createdAt}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[230px] truncate font-bold text-slate-800">
                          {record.items[0]?.optionLabel}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {record.items.length > 1
                            ? `외 ${record.items.length - 1}개 SKU`
                            : "단일 SKU"}{" "}
                          · 총{" "}
                          {record.items.reduce(
                            (sum, item) => sum + item.quantityPerBundle,
                            0,
                          )}
                          개 구성
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-800">
                          {record.fulfillmentCenter}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {[
                            ...new Set(
                              record.items.map((item) => item.channelName),
                            ),
                          ].join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p
                          className={`text-base font-black tabular-nums ${record.availableBundleStock <= 10 ? "text-amber-700" : "text-emerald-700"}`}
                        >
                          {record.availableBundleStock.toLocaleString()}세트
                        </p>
                        <p className="mt-1 text-[9px] text-slate-400">
                          구성 가능
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-black text-slate-900">
                          {formatBundleCurrency(record.sellingPrice)}
                        </p>
                        <p className="mt-1 text-[9px] text-slate-400">
                          합계 {formatBundleCurrency(record.listPrice)}
                        </p>
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-black ${record.marginRate < 0 ? "text-rose-700" : "text-[#0F4C3A]"}`}
                      >
                        {record.marginRate}%
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td
                        className="px-5 py-4 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedBundle(record)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          상세 조회
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-14 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              조건에 맞는 번들 재고가 없습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
              }}
              className="mt-3 text-xs font-bold text-[#0F4C3A]"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {selectedBundle && (
        <BundleInventoryDetail
          bundle={selectedBundle}
          onClose={() => setSelectedBundle(null)}
          onOpenSkuDetail={(item) => {
            setSelectedBundle(null);
            onOpenSkuDetail(item);
          }}
        />
      )}
    </section>
  );
}

function BundleSummaryCard({
  icon,
  label,
  value,
  description,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-[10px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-[9px] text-slate-400">{description}</p>
    </div>
  );
}

function BundleInventoryDetail({
  bundle,
  onClose,
  onOpenSkuDetail,
}: {
  bundle: BundleInventoryRecord;
  onClose: () => void;
  onOpenSkuDetail: (item: BundleInventoryItem) => void;
}) {
  const meta = BUNDLE_STATUS_META[bundle.status];
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bundle-inventory-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4C3A]">
              <Layers3 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="bundle-inventory-detail-title"
                  className="text-lg font-black text-slate-950"
                >
                  {bundle.bundleName}
                </h2>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {bundle.bundleCode} · {bundle.createdAt}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="번들 재고 상세 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BundleDetailMetric
              label="가용 번들 재고"
              value={`${bundle.availableBundleStock.toLocaleString()}세트`}
            />
            <BundleDetailMetric
              label="번들 판매가"
              value={formatBundleCurrency(bundle.sellingPrice)}
            />
            <BundleDetailMetric
              label="단위 공헌이익"
              value={formatBundleCurrency(bundle.estimatedProfit)}
              danger={bundle.estimatedProfit < 0}
            />
            <BundleDetailMetric
              label="공헌이익률"
              value={`${bundle.marginRate}%`}
              danger={bundle.marginRate < 0}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-950">구성 SKU</h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  구성품별 재고와 세트당 필요 수량
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {bundle.items.length}개 SKU
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {bundle.items.map((item) => {
                const possible = Math.floor(
                  item.availableStock / item.quantityPerBundle,
                );
                const limiting = possible === bundle.availableBundleStock;
                return (
                  <button
                    type="button"
                    key={`${bundle.bundleCode}-${item.skuId}`}
                    onClick={() => onOpenSkuDetail(item)}
                    aria-label={`${item.optionLabel} 전체 재고 상세 보기`}
                    className={`flex w-full flex-col gap-3 rounded-xl border p-3 text-left outline-none transition sm:flex-row sm:items-center sm:justify-between ${limiting ? "border-amber-200 bg-amber-50/60 hover:border-amber-300" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"} focus:ring-2 focus:ring-[#0F4C3A]/20`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-black text-slate-900">
                          {item.optionLabel}
                        </p>
                        {limiting && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                            제한 SKU
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[9px] text-slate-400">
                        {item.skuCode} · {item.channelName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <div className="grid grid-cols-3 gap-5 text-right text-[10px]">
                        <div>
                          <p className="text-slate-400">가용재고</p>
                          <p className="mt-1 font-black text-slate-800">
                            {item.availableStock}
                            {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">세트당</p>
                          <p className="mt-1 font-black text-slate-800">
                            {item.quantityPerBundle}
                            {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">구성 가능</p>
                          <p className="mt-1 font-black text-[#0F4C3A]">
                            {possible}세트
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black text-[#0F4C3A]">
                        재고 상세
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>현재 판매가 합계</span>
              <strong className="text-slate-900">
                {formatBundleCurrency(bundle.listPrice)}
              </strong>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>운영 물류센터</span>
              <strong className="text-slate-900">
                {bundle.fulfillmentCenter}
              </strong>
            </div>
          </div>
        </div>
        <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
          >
            닫기
          </button>
        </footer>
      </section>
    </div>
  );
}

function BundleDetailMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${danger ? "bg-rose-50" : "bg-slate-50"}`}>
      <p
        className={`text-[9px] ${danger ? "text-rose-600" : "text-slate-500"}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-black ${danger ? "text-rose-700" : "text-slate-950"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusWithTooltip({
  label,
  className,
  tooltip,
}: {
  label: string;
  className: string;
  tooltip: string;
}) {
  return (
    <span className="group/status relative inline-flex">
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${className}`}
      >
        {label}
        <Info className="h-3 w-3 opacity-60" />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2.5 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition group-hover/status:visible group-hover/status:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  width = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
  width?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`relative shrink-0 ${width}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F4C3A] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="ALL">{allLabel}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
  );
}

function CategoryDrilldownModal({
  categoryRows,
  largeOptions,
  mediumOptions,
  smallOptions,
  large,
  medium,
  small,
  onLargeChange,
  onMediumChange,
  onSmallChange,
  onReset,
  onClose,
}: {
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
  const path = [
    large !== "ALL" ? large : null,
    medium !== "ALL" ? medium : null,
    small !== "ALL" ? small : null,
  ]
    .filter(Boolean)
    .join(" › ");
  const countFor = (level: "large" | "medium" | "small", value: string) =>
    categoryRows.filter((row) => {
      if (level === "large") return row.large === value;
      if (level === "medium")
        return row.large === large && row.medium === value;
      return (
        row.large === large && row.medium === medium && row.small === value
      );
    }).length;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-drilldown-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-black text-emerald-700">
              상품 분류 탐색
            </p>
            <h2
              id="category-drilldown-title"
              className="mt-1 text-lg font-black text-slate-950"
            >
              카테고리 드릴다운
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              대분류부터 순서대로 내려가며 재고 범위를 좁힙니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="카테고리 선택창 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-[340px] md:grid-cols-3">
          <CategoryColumn
            title="1. 대분류"
            description="사업 상품군"
            options={largeOptions}
            selected={large}
            onSelect={onLargeChange}
            getCount={(value) => countFor("large", value)}
          />
          <CategoryColumn
            title="2. 중분류"
            description={
              large === "ALL"
                ? "대분류를 먼저 선택하세요"
                : `${large} 하위 분류`
            }
            options={large === "ALL" ? [] : mediumOptions}
            selected={medium}
            onSelect={onMediumChange}
            getCount={(value) => countFor("medium", value)}
            muted={large === "ALL"}
          />
          <CategoryColumn
            title="3. 소분류"
            description={
              medium === "ALL"
                ? "중분류를 먼저 선택하세요"
                : `${medium} SKU 품목`
            }
            options={medium === "ALL" ? [] : smallOptions}
            selected={small}
            onSelect={onSmallChange}
            getCount={(value) => countFor("small", value)}
            muted={medium === "ALL"}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold text-slate-500">현재 선택</p>
            <p className="mt-1 text-xs font-black text-slate-900">
              {path || "전체 카테고리"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white"
            >
              전체 초기화
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#0F4C3A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0B392B]"
            >
              선택 완료
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CategoryColumn({
  title,
  description,
  options,
  selected,
  onSelect,
  getCount,
  muted = false,
}: {
  title: string;
  description: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  getCount: (value: string) => number;
  muted?: boolean;
}) {
  return (
    <div
      className={`border-b border-slate-200 p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${muted ? "bg-slate-50" : "bg-white"}`}
    >
      <div className="mb-3">
        <p
          className={`text-xs font-black ${muted ? "text-slate-500" : "text-slate-900"}`}
        >
          {title}
        </p>
        <p className="mt-1 text-[10px] font-medium text-slate-500">
          {description}
        </p>
      </div>
      {options.length > 0 ? (
        <div className="space-y-1.5">
          {options.map((option) => {
            const active = selected === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${active ? "border-[#0F4C3A] bg-emerald-50 text-[#0F4C3A]" : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{option}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${active ? "bg-white text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                >
                  {getCount(option)} SKU
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-[11px] font-medium leading-5 text-slate-500">
          {description}
        </div>
      )}
    </div>
  );
}

export default function UnifiedInventoryPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-slate-500">
            통합재고를 불러오고 있습니다.
          </div>
        }
      >
        <UnifiedInventoryContent />
      </Suspense>
    </AppLayout>
  );
}
