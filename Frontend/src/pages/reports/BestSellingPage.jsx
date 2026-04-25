import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  CircleDollarSign,
  Crown,
  ListFilter,
  PackageCheck,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { fetchBestSelling } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function toNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function MetricCard({ title, value, helper, icon: Icon, tone = "neutral" }) {
  const toneClasses = {
    accent: "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    dark: "border-slate-800 bg-slate-950 text-[#ffcf83]",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            toneClasses[tone] || toneClasses.neutral
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const rankClasses =
    rank === 1
      ? "border-[#ffcf83] bg-[#ffcf83] text-slate-950"
      : rank === 2
        ? "border-slate-300 bg-slate-100 text-slate-700"
        : rank === 3
          ? "border-orange-200 bg-orange-100 text-orange-700"
          : "border-slate-200 bg-white text-slate-500";

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${rankClasses}`}
    >
      {rank}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
        <Trophy size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">
        No best selling data found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Sales records will appear here once products are sold and the report has
        data to rank.
      </p>
    </div>
  );
}

function TopSellerCard({ topProduct, totalRevenue, totalQuantity }) {
  if (!topProduct) return null;

  const topQuantity = toNumber(topProduct.total_quantity_sold);
  const topRevenue = toNumber(topProduct.total_sales_amount);
  const revenueShare = totalRevenue
    ? Math.round((topRevenue / totalRevenue) * 100)
    : 0;
  const quantityShare = totalQuantity
    ? Math.round((topQuantity / totalQuantity) * 100)
    : 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
            <Crown size={25} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Top Seller
            </p>
            <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
              {topProduct.item_name || "Unnamed product"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Best performing product in the selected top {""}
              ranking, based on total quantity sold.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Units sold
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950">
              {formatNumber(topQuantity)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {quantityShare}% of listed units
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Sales amount
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950">
              {formatCurrency(topRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {revenueShare}% of listed revenue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BestSellingTable({ rows, loading }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Product Ranking
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Best selling product list
          </h2>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {rows.length} products
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-4 font-bold">Rank</th>
              <th className="px-5 py-4 font-bold">Product</th>
              <th className="px-5 py-4 text-right font-bold">Quantity Sold</th>
              <th className="px-5 py-4 text-right font-bold">
                Total Sales Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-10">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={row.item_id || index}
                    className={`transition hover:bg-slate-50 ${
                      rank === 1 ? "bg-[#ffcf83]/10" : "bg-white"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            rank === 1
                              ? "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {rank === 1 ? (
                            <Trophy size={17} />
                          ) : (
                            <PackageCheck size={17} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">
                            {row.item_name || "Unnamed product"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Product ID: {row.item_id || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatNumber(row.total_quantity_sold)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(row.total_sales_amount)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BestSellingPage() {
  const dispatch = useDispatch();
  const { bestSelling, loading, error } = useSelector((state) => state.reports);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    dispatch(fetchBestSelling(limit));
  }, [dispatch, limit]);

  const safeData = Array.isArray(bestSelling) ? bestSelling : [];
  const topProduct = safeData[0] || null;

  const reportStats = useMemo(() => {
    const totalQuantity = safeData.reduce(
      (sum, row) => sum + toNumber(row.total_quantity_sold),
      0,
    );
    const totalRevenue = safeData.reduce(
      (sum, row) => sum + toNumber(row.total_sales_amount),
      0,
    );
    const averageRevenue = safeData.length ? totalRevenue / safeData.length : 0;

    return {
      totalProducts: safeData.length,
      totalQuantity,
      totalRevenue,
      averageRevenue,
    };
  }, [safeData]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              Product Performance
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Best Selling Products
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Products ranked by total quantity sold from completed sales.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <ListFilter size={14} />
              Show top
            </label>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/50"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading best selling products...
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Products listed"
          value={reportStats.totalProducts}
          helper={`Top ${limit} ranking view`}
          icon={PackageCheck}
          tone="accent"
        />
        <MetricCard
          title="Total units sold"
          value={formatNumber(reportStats.totalQuantity)}
          helper="Combined listed quantity"
          icon={ShoppingBag}
        />
        <MetricCard
          title="Total sales"
          value={formatCurrency(reportStats.totalRevenue)}
          helper="Revenue from listed products"
          icon={CircleDollarSign}
          tone="positive"
        />
        <MetricCard
          title="Average sales"
          value={formatCurrency(reportStats.averageRevenue)}
          helper="Average per listed product"
          icon={BarChart3}
          tone="dark"
        />
      </div>

      {!loading && topProduct ? (
        <TopSellerCard
          topProduct={topProduct}
          totalRevenue={reportStats.totalRevenue}
          totalQuantity={reportStats.totalQuantity}
        />
      ) : null}

      <BestSellingTable rows={safeData} loading={loading} />
    </div>
  );
}
