import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  PackageSearch,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchDashboardSummary,
  fetchLowStockItems,
} from "../../features/dashboard/dashboardSlice";
import { fetchPurchases } from "../../features/purchases/purchasesSlice";
import { fetchSalesReport } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  emphasis = false,
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </h3>
          {description ? (
            <p className="mt-2 text-sm leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            emphasis
              ? "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function parseAmount(value) {
  const amount = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function shortLabel(value) {
  if (!value) return "—";
  const label = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Date(`${label}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (/^\d{4}-\d{2}$/.test(label)) {
    return new Date(`${label}-01T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }
  return label;
}

function compactNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(Math.round(number));
}

function buildSalesPurchasesTrendData(salesReport, purchases) {
  const grouped = {};

  if (Array.isArray(salesReport)) {
    salesReport.forEach((row) => {
      const period = String(row.period || row.date || "").slice(0, 10);
      if (!period) return;
      if (!grouped[period]) {
        grouped[period] = { period, sales: 0, purchases: 0 };
      }
      grouped[period].sales += parseAmount(
        row.total_sales ?? row.sales ?? row.amount ?? row.total ?? 0,
      );
    });
  }

  if (Array.isArray(purchases)) {
    purchases.forEach((purchase) => {
      const period = String(
        purchase.purchase_date || purchase.date || purchase.created_at || "",
      ).slice(0, 10);
      if (!period) return;
      if (!grouped[period]) {
        grouped[period] = { period, sales: 0, purchases: 0 };
      }
      grouped[period].purchases += parseAmount(
        purchase.total_amount ?? purchase.grand_total ?? purchase.total ?? 0,
      );
    });
  }

  return Object.values(grouped)
    .sort((a, b) => String(a.period).localeCompare(String(b.period)))
    .slice(-12)
    .map((row) => ({
      ...row,
      label: shortLabel(row.period),
    }));
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
      <p className="font-bold text-white">{row?.period || label}</p>
      <div className="mt-3 space-y-2">
        <div className="flex min-w-[190px] items-center justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffcf83]" />
            Sales
          </span>
          <span className="font-bold text-white">
            {formatCurrency(row?.sales || 0)}
          </span>
        </div>
        <div className="flex min-w-[190px] items-center justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            Purchases
          </span>
          <span className="font-bold text-white">
            {formatCurrency(row?.purchases || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[430px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
      <div>
        <p className="text-sm font-semibold text-slate-700">
          No sales or purchase trend available yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          The trend graph will appear after transactions are recorded.
        </p>
      </div>
    </div>
  );
}

function SalesPurchasesTrendCard({ data, totalSales, totalPurchases }) {
  const highestPoint = data.reduce(
    (max, row) =>
      Math.max(max, Number(row.sales || 0), Number(row.purchases || 0)),
    0,
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fff8ec] to-white px-6 py-5">
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: accentColor }}
        />
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#ffcf83]/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-sky-100/70 blur-2xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ffcf83] bg-[#ffcf83]/25 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
              <span className="h-2 w-2 rounded-full bg-[#f0a53c]" />
              Sales vs Purchases
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Sales vs Purchases Trend
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Smooth comparative line graph for sales and purchase movement in
              one easy dashboard view.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Sales
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-950">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Purchases
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-950">
                {formatCurrency(totalPurchases)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Highest Point
              </p>
              <p className="mt-1 text-lg font-extrabold text-white">
                {formatCurrency(highestPoint)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {data.length ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-4 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,207,131,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_30%)]" />
            <div className="absolute inset-x-8 top-8 h-px bg-white/10" />
            <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Performance movement
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Recent sales and purchase values on one smooth trend line.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ffcf83]" />
                  Sales
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Purchases
                </span>
              </div>
            </div>

            <div className="relative h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data}
                  margin={{ top: 18, right: 26, left: 10, bottom: 12 }}
                >
                  <defs>
                    <linearGradient
                      id="salesAreaFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ffcf83"
                        stopOpacity={0.36}
                      />
                      <stop
                        offset="70%"
                        stopColor="#ffcf83"
                        stopOpacity={0.08}
                      />
                      <stop offset="100%" stopColor="#ffcf83" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="salesStroke"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#f0a53c" />
                      <stop offset="100%" stopColor="#ffcf83" />
                    </linearGradient>
                    <linearGradient
                      id="purchaseStroke"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#bae6fd" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 8"
                    vertical={false}
                    stroke="rgba(255,255,255,0.12)"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 700 }}
                    dy={12}
                  />
                  <YAxis
                    width={58}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={compactNumber}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{
                      color: "#cbd5e1",
                      fontSize: 12,
                      paddingBottom: 8,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="url(#salesStroke)"
                    strokeWidth={4}
                    fill="url(#salesAreaFill)"
                    dot={{
                      r: 3.5,
                      fill: "#0f172a",
                      stroke: "#ffcf83",
                      strokeWidth: 2.5,
                    }}
                    activeDot={{
                      r: 7,
                      fill: "#ffcf83",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name="Purchases"
                    stroke="url(#purchaseStroke)"
                    strokeWidth={3}
                    dot={{
                      r: 3.2,
                      fill: "#0f172a",
                      stroke: "#38bdf8",
                      strokeWidth: 2.3,
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#38bdf8",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyChartState />
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { summary, lowStockItems } = useSelector((state) => state.dashboard);
  const { salesReport } = useSelector((state) => state.reports);
  const { list: purchases } = useSelector((state) => state.purchases);
  const safeLowStockItems = Array.isArray(lowStockItems) ? lowStockItems : [];

  useEffect(() => {
    dispatch(fetchDashboardSummary());
    dispatch(fetchLowStockItems());
    dispatch(fetchSalesReport());
    dispatch(fetchPurchases());
  }, [dispatch]);

  const trendChartData = useMemo(
    () => buildSalesPurchasesTrendData(salesReport, purchases),
    [salesReport, purchases],
  );

  const totalTrendSales = trendChartData.reduce(
    (sum, row) => sum + Number(row.sales || 0),
    0,
  );
  const totalTrendPurchases = trendChartData.reduce(
    (sum, row) => sum + Number(row.purchases || 0),
    0,
  );

  const metrics = [
    {
      title: "Today's Sales",
      value: formatCurrency(summary?.today_sales),
      description: "Sales recorded today",
      icon: Banknote,
      emphasis: true,
    },
    {
      title: "Monthly Sales",
      value: formatCurrency(summary?.month_sales),
      description: "Current month revenue",
      icon: TrendingUp,
    },
    {
      title: "Yearly Sales",
      value: formatCurrency(summary?.year_sales),
      description: "Year-to-date revenue",
      icon: CalendarDays,
    },
    {
      title: "Receivables",
      value: formatCurrency(summary?.total_receivables),
      description: "Amount pending from customers",
      icon: WalletCards,
    },
    {
      title: "Payables",
      value: formatCurrency(summary?.total_payables),
      description: "Amount pending to suppliers",
      icon: ReceiptText,
    },
    {
      title: "Low Stock Items",
      value: summary?.low_stock_count || 0,
      description: "Items below threshold",
      icon: PackageSearch,
      emphasis: true,
    },
  ];

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
              Management Dashboard
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Business overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Sales, receivables, payables, and stock alerts presented in a
              clean operational view.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Today
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(summary?.today_sales)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#ffcf83]/35 p-4 text-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Stock Alerts
              </p>
              <p className="mt-2 text-2xl font-bold">
                {summary?.low_stock_count || 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <SalesPurchasesTrendCard
        data={trendChartData}
        totalSales={totalTrendSales}
        totalPurchases={totalTrendPurchases}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Low Stock Alerts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Inventory items that need purchasing attention.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ffcf83] bg-[#ffcf83]/25 px-3 py-1.5 text-sm font-semibold text-slate-800">
            <AlertTriangle size={16} />
            {safeLowStockItems.length} alerts
          </span>
        </div>

        {safeLowStockItems.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">Available</th>
                  <th className="px-5 py-3 font-semibold">Threshold</th>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeLowStockItems.map((item, index) => {
                  const available = Number(item.stock_quantity || 0);
                  const threshold = Number(item.low_stock_threshold || 0);
                  const percent =
                    threshold > 0
                      ? Math.min((available / threshold) * 100, 100)
                      : 0;

                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                            {(item.item_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-950">
                              {item.item_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Restock recommended
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600">
                        {item.sku}
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-32">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-950">
                              {item.stock_quantity}
                            </span>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Low
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-[#ffcf83]"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {item.low_stock_threshold}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{item.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
              <PackageSearch size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-950">
              No low stock alerts
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Inventory is currently above the configured thresholds.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
