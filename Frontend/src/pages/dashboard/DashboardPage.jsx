import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  LineChart,
  PackageSearch,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { fetchDashboardSummary, fetchLowStockItems } from "../../features/dashboard/dashboardSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function MetricCard({ title, value, description, icon: Icon, emphasis = false }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</h3>
          {description ? <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            emphasis ? "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950" : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { summary, lowStockItems } = useSelector((state) => state.dashboard);
  const safeLowStockItems = Array.isArray(lowStockItems) ? lowStockItems : [];

  useEffect(() => {
    dispatch(fetchDashboardSummary());
    dispatch(fetchLowStockItems());
  }, [dispatch]);

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
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              Management Dashboard
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Business overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Sales, receivables, payables, and stock alerts presented in a clean operational view.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Today</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.today_sales)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#ffcf83]/35 p-4 text-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Stock Alerts</p>
              <p className="mt-2 text-2xl font-bold">{summary?.low_stock_count || 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Low Stock Alerts</h2>
              <p className="mt-1 text-sm text-slate-500">Inventory items that need purchasing attention.</p>
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
                    const percent = threshold > 0 ? Math.min((available / threshold) * 100, 100) : 0;

                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                              {(item.item_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{item.item_name}</p>
                              <p className="text-xs text-slate-500">Restock recommended</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{item.sku}</td>
                        <td className="px-5 py-4">
                          <div className="min-w-32">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-950">{item.stock_quantity}</span>
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Low</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-[#ffcf83]" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700">{item.low_stock_threshold}</td>
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
              <h3 className="text-base font-semibold text-slate-950">No low stock alerts</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Inventory is currently above the configured thresholds.
              </p>
            </div>
          )}
        </div>

       

         

                 
      </section>
    </div>
  );
}
