import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  LineChart,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  fetchSalesReport,
  setSalesPeriod,
} from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

const periodOptions = [
  {
    value: "daily",
    label: "Daily",
    helper: "Day wise sales",
  },
  {
    value: "monthly",
    label: "Monthly",
    helper: "Month wise sales",
  },
  {
    value: "yearly",
    label: "Yearly",
    helper: "Year wise sales",
  },
];

function toNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getPeriodLabel(period) {
  return (
    periodOptions.find((option) => option.value === period)?.label || "Selected"
  );
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

function EmptyState({ selectedPeriod }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
        <BarChart3 size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">
        No sales data found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        There are no {selectedPeriod.toLowerCase()} sales records available for
        this report yet.
      </p>
    </div>
  );
}

function SalesTable({ rows, totalSales }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Sales Breakdown
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Period wise summary
          </h2>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {rows.length} records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-4 font-bold">#</th>
              <th className="px-5 py-4 font-bold">Period</th>
              <th className="px-5 py-4 text-right font-bold">Total Sales</th>
              <th className="px-5 py-4 font-bold">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const sales = toNumber(row.total_sales);
              const share = totalSales > 0 ? (sales / totalSales) * 100 : 0;

              return (
                <tr
                  key={row.id || `${row.period}-${index}`}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-[#ffcf83]/10"
                >
                  <td className="px-5 py-4 font-semibold text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <CalendarDays size={17} />
                      </div>
                      <span className="font-semibold text-slate-900">
                        {row.period || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-950">
                    {formatCurrency(sales)}
                  </td>
                  <td className="min-w-[220px] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#ffcf83]"
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-bold text-slate-600">
                        {share.toFixed(1)}%
                      </span>
                    </div>
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

export default function SalesReportPage() {
  const dispatch = useDispatch();
  const { salesReport, salesPeriod } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchSalesReport());
  }, [dispatch, salesPeriod]);

  const rows = useMemo(
    () => (Array.isArray(salesReport) ? salesReport : []),
    [salesReport],
  );

  const reportStats = useMemo(() => {
    const totalSales = rows.reduce(
      (sum, row) => sum + toNumber(row.total_sales),
      0,
    );
    const bestPeriod = rows.reduce(
      (best, row) => {
        const rowSales = toNumber(row.total_sales);
        return rowSales > best.total_sales
          ? { period: row.period, total_sales: rowSales }
          : best;
      },
      { period: "-", total_sales: 0 },
    );
    const averageSales = rows.length ? totalSales / rows.length : 0;

    return {
      totalSales,
      bestPeriod,
      averageSales,
      recordCount: rows.length,
    };
  }, [rows]);

  const selectedPeriodLabel = getPeriodLabel(salesPeriod);

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
              Sales Reporting
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Sales Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Daily, monthly, and yearly sales summaries with clean totals,
              period comparison, and contribution view.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {selectedPeriodLabel} Total
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <CircleDollarSign size={18} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(reportStats.totalSales)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Across {reportStats.recordCount} periods
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(reportStats.totalSales)}
          helper={`${selectedPeriodLabel} summary total`}
          icon={CircleDollarSign}
          tone="accent"
        />
        <MetricCard
          title="Records"
          value={reportStats.recordCount}
          helper="Rows available in report"
          icon={BarChart3}
        />
        <MetricCard
          title="Best Period"
          value={reportStats.bestPeriod.period || "-"}
          helper={formatCurrency(reportStats.bestPeriod.total_sales)}
          icon={Trophy}
          tone="positive"
        />
        <MetricCard
          title="Average Sales"
          value={formatCurrency(reportStats.averageSales)}
          helper="Average per report row"
          icon={TrendingUp}
          tone="dark"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
              <LineChart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Report Period
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select how sales should be grouped in the report.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {periodOptions.map((option) => {
              const active = salesPeriod === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => dispatch(setSalesPeriod(option.value))}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-[#ffcf83] bg-[#ffcf83]/35 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-950">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {rows.length ? (
        <SalesTable rows={rows} totalSales={reportStats.totalSales} />
      ) : (
        <EmptyState selectedPeriod={selectedPeriodLabel} />
      )}
    </div>
  );
}
