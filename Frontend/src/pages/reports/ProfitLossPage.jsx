import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgePercent,
  BarChart3,
  Calculator,
  CircleDollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { fetchProfitLoss } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function toNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function ReportMetric({ title, value, helper, icon: Icon, tone = "neutral" }) {
  const toneClasses = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    negative: "border-rose-200 bg-rose-50 text-rose-700",
    accent: "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
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

function StatementRow({
  label,
  value,
  helper,
  strong = false,
  highlight = false,
}) {
  return (
    <div
      className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        highlight ? "bg-[#ffcf83]/15" : "bg-white"
      }`}
    >
      <div>
        <p
          className={`text-sm ${
            strong ? "font-bold text-slate-950" : "font-semibold text-slate-800"
          }`}
        >
          {label}
        </p>
        {helper ? (
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
      <p
        className={`text-right ${
          strong
            ? "text-lg font-bold text-slate-950"
            : "text-sm font-semibold text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BreakdownBar({ label, value, maxValue, tone = "slate" }) {
  const numericValue = Math.abs(toNumber(value));
  const width = Math.min(
    100,
    Math.round((numericValue / Math.max(maxValue, 1)) * 100),
  );
  const barTone = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-[#ffcf83]",
    slate: "bg-slate-900",
  }[tone];

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-sm font-bold text-slate-950">
          {formatCurrency(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barTone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfitLossPage() {
  const dispatch = useDispatch();
  const { profitLoss, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchProfitLoss());
  }, [dispatch]);

  const revenue = toNumber(profitLoss?.total_revenue);
  const cogs = toNumber(profitLoss?.total_cogs);
  const expenses = toNumber(profitLoss?.total_expenses);
  const grossProfit = revenue - cogs;
  const netProfit = toNumber(profitLoss?.net_profit);
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const expenseRatio = revenue > 0 ? (expenses / revenue) * 100 : 0;
  const maxBreakdownValue = Math.max(
    revenue,
    cogs,
    expenses,
    Math.abs(netProfit),
    1,
  );
  const isProfitable = netProfit >= 0;

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
              Financial Reporting
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Profit / Loss Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Revenue, cost of goods sold, expenses, and net profitability in
              one clean report.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Net Result
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                {isProfitable ? (
                  <TrendingUp size={18} />
                ) : (
                  <TrendingDown size={18} />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(netProfit)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isProfitable ? "Profit position" : "Loss position"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          title="Revenue"
          value={formatCurrency(revenue)}
          helper="Total sales income"
          icon={CircleDollarSign}
          tone="accent"
        />
        <ReportMetric
          title="COGS"
          value={formatCurrency(cogs)}
          helper="Cost of goods sold"
          icon={Calculator}
        />
        <ReportMetric
          title="Expenses"
          value={formatCurrency(expenses)}
          helper={`${expenseRatio.toFixed(1)}% of revenue`}
          icon={WalletCards}
        />
        <ReportMetric
          title="Net Profit"
          value={formatCurrency(netProfit)}
          helper={`${netMargin.toFixed(1)}% net margin`}
          icon={isProfitable ? TrendingUp : TrendingDown}
          tone={isProfitable ? "positive" : "negative"}
        />
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading profit/loss report...
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Income Statement Summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Clean breakdown from revenue to net profit.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                Live report
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <StatementRow
                label="Total Revenue"
                helper="Income generated from sales."
                value={formatCurrency(revenue)}
              />
              <StatementRow
                label="Less: Cost of Goods Sold"
                helper="Inventory cost attached to sales."
                value={`-${formatCurrency(cogs)}`}
              />
              <StatementRow
                label="Gross Profit"
                helper="Revenue after direct product costs."
                value={formatCurrency(grossProfit)}
                strong
                highlight
              />
              <StatementRow
                label="Less: Operating Expenses"
                helper="Business expenses recorded in the system."
                value={`-${formatCurrency(expenses)}`}
              />
              <StatementRow
                label="Net Profit / Loss"
                helper="Final result after COGS and expenses."
                value={formatCurrency(netProfit)}
                strong
                highlight
              />
            </div>
          </section>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div
                className="h-1 w-full"
                style={{ backgroundColor: accentColor }}
              />
              <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                    <BadgePercent size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Profitability
                    </p>
                    <h3 className="text-base font-bold text-slate-950">
                      Margin Overview
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Net Margin
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {netMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Expense Ratio
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {expenseRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Breakdown
                  </p>
                  <h3 className="text-base font-bold text-slate-950">
                    Amount Comparison
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                <BreakdownBar
                  label="Revenue"
                  value={revenue}
                  maxValue={maxBreakdownValue}
                  tone="emerald"
                />
                <BreakdownBar
                  label="COGS"
                  value={cogs}
                  maxValue={maxBreakdownValue}
                  tone="amber"
                />
                <BreakdownBar
                  label="Expenses"
                  value={expenses}
                  maxValue={maxBreakdownValue}
                  tone="rose"
                />
                <BreakdownBar
                  label="Net Result"
                  value={netProfit}
                  maxValue={maxBreakdownValue}
                  tone="slate"
                />
              </div>
            </section>
          </aside>
        </div>
      )}

      {!loading && !profitLoss ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
            <FileText size={22} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-950">
            No profit/loss data found
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Once sales, COGS, and expenses are recorded, the report will appear
            here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
