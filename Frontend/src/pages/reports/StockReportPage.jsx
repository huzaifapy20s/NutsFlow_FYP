import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Layers,
  Package,
  PackageCheck,
  PackageSearch,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { fetchStockReport } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function toNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function MetricCard({ title, value, helper, icon: Icon, tone = "neutral" }) {
  const toneClasses = {
    accent: "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
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

function StockStatusBadge({ isLowStock }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isLowStock
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isLowStock ? "bg-amber-500" : "bg-emerald-500"
        }`}
      />
      {isLowStock ? "Low Stock" : "Healthy"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
        <PackageSearch size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">
        No stock records found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Stock report data will appear here once inventory items are available in
        the system.
      </p>
    </div>
  );
}

function StockTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Stock Ledger
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Current inventory position
          </h2>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {rows.length} items
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-4 font-bold">#</th>
              <th className="px-5 py-4 font-bold">Item</th>
              <th className="px-5 py-4 font-bold">SKU</th>
              <th className="px-5 py-4 text-right font-bold">Stock</th>
              <th className="px-5 py-4 text-right font-bold">Average Cost</th>
              <th className="px-5 py-4 text-right font-bold">Sale Price</th>
              <th className="px-5 py-4 text-right font-bold">Stock Value</th>
              <th className="px-5 py-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const stock = toNumber(row.stock_quantity);
              const averageCost = toNumber(row.average_cost);
              const salePrice = toNumber(row.sale_price);
              const stockValue = stock * averageCost;

              return (
                <tr
                  key={row.id || row.item_id || `${row.item_name}-${index}`}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-[#ffcf83]/10"
                >
                  <td className="px-5 py-4 font-semibold text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                        <Package size={17} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {row.item_name || "-"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Inventory item
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-600">
                    {row.sku || "-"}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-950">
                    {stock.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-700">
                    {formatCurrency(averageCost)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-700">
                    {formatCurrency(salePrice)}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-950">
                    {formatCurrency(stockValue)}
                  </td>
                  <td className="px-5 py-4">
                    <StockStatusBadge isLowStock={row.is_low_stock} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StockReportPage() {
  const dispatch = useDispatch();
  const { stockReport } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchStockReport());
  }, [dispatch]);

  const rows = useMemo(
    () => (Array.isArray(stockReport) ? stockReport : []),
    [stockReport],
  );

  const reportStats = useMemo(() => {
    const totalItems = rows.length;
    const totalStock = rows.reduce(
      (sum, row) => sum + toNumber(row.stock_quantity),
      0,
    );
    const lowStockCount = rows.filter((row) => row.is_low_stock).length;
    const stockValue = rows.reduce(
      (sum, row) =>
        sum + toNumber(row.stock_quantity) * toNumber(row.average_cost),
      0,
    );
    const retailValue = rows.reduce(
      (sum, row) =>
        sum + toNumber(row.stock_quantity) * toNumber(row.sale_price),
      0,
    );
    const healthyItems = totalItems - lowStockCount;
    const lowStockRate = totalItems ? (lowStockCount / totalItems) * 100 : 0;
    const topValueItem = rows.reduce(
      (best, row) => {
        const rowValue =
          toNumber(row.stock_quantity) * toNumber(row.sale_price);
        return rowValue > best.value
          ? { name: row.item_name || "-", value: rowValue }
          : best;
      },
      { name: "-", value: 0 },
    );

    return {
      totalItems,
      totalStock,
      lowStockCount,
      stockValue,
      retailValue,
      healthyItems,
      lowStockRate,
      topValueItem,
    };
  }, [rows]);

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
              Inventory Reporting
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Stock Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Current stock, low-stock signals, average cost, retail price, and
              inventory valuation in one clean report.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[270px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Stock Value
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <CircleDollarSign size={18} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(reportStats.stockValue)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Based on average cost
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Items"
          value={reportStats.totalItems}
          helper="Items included in report"
          icon={PackageCheck}
          tone="accent"
        />
        <MetricCard
          title="Total Stock"
          value={reportStats.totalStock.toFixed(2)}
          helper="Combined available quantity"
          icon={Warehouse}
        />
        <MetricCard
          title="Low Stock"
          value={reportStats.lowStockCount}
          helper={`${reportStats.lowStockRate.toFixed(1)}% items need attention`}
          icon={AlertTriangle}
          tone="warning"
        />
        <MetricCard
          title="Retail Value"
          value={formatCurrency(reportStats.retailValue)}
          helper="Estimated by sale price"
          icon={TrendingUp}
          tone="dark"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
              <BarChart3 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-950">
                Inventory Health Overview
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                A quick health snapshot based on low-stock flags and current
                quantity levels.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Healthy Items
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {reportStats.healthyItems}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Items not marked as low stock
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Top Retail Value Item
                  </p>
                  <p className="mt-2 truncate text-2xl font-bold text-slate-950">
                    {reportStats.topValueItem.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCurrency(reportStats.topValueItem.value)} estimated
                    value
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Valuation Split
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-950">
                  Cost vs Retail
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-600">
                  Average cost value
                </span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(reportStats.stockValue)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-600">
                  Sale price value
                </span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(reportStats.retailValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {rows.length ? <StockTable rows={rows} /> : <EmptyState />}
    </div>
  );
}
