import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchIncomeStatement } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign } from "lucide-react";

function LineItem({ label, value, indent = false, bold = false, positive = true, separator = false }) {
  const numVal = parseFloat(value || 0);
  return (
    <>
      {separator && <tr><td colSpan={2} className="py-2"><hr className="border-slate-200" /></td></tr>}
      <tr className={`${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>
        <td className={`py-2 ${indent ? "pl-8" : "pl-2"} text-sm`}>{label}</td>
        <td className={`py-2 pr-2 text-right text-sm ${bold ? "text-slate-900" : numVal < 0 ? "text-red-600" : positive ? "text-green-700" : "text-red-600"}`}>
          {formatCurrency(numVal)}
        </td>
      </tr>
    </>
  );
}

export default function IncomeStatementPage() {
  const dispatch = useDispatch();
  const { incomeStatement, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchIncomeStatement());
  }, [dispatch]);

  const data = incomeStatement;
  const grossProfit = parseFloat(data?.gross_profit || 0);
  const netProfit = parseFloat(data?.net_profit || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Income Statement</h1>
        <p className="page-subtitle">Revenue, cost of goods sold, expenses, and net profit summary.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading...</p>}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(data.total_revenue)}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-orange-100 p-3">
                <ShoppingBag size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Cost of Goods Sold</p>
                <p className="text-lg font-bold text-orange-700">{formatCurrency(data.total_cogs)}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-red-100 p-3">
                <TrendingDown size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(data.total_expenses)}</p>
              </div>
            </div>
            <div className={`card flex items-center gap-4 ${netProfit >= 0 ? "border-l-4 border-l-green-500 bg-green-50" : "border-l-4 border-l-red-500 bg-red-50"}`}>
              <div className={`rounded-xl p-3 ${netProfit >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                <DollarSign size={20} className={netProfit >= 0 ? "text-green-700" : "text-red-700"} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Net Profit</p>
                <p className={`text-lg font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(data.net_profit)}
                </p>
              </div>
            </div>
          </div>

          {/* Formal Statement */}
          <div className="card max-w-2xl">
            <h2 className="mb-1 text-base font-bold text-slate-900">Formal Income Statement</h2>
            <p className="mb-4 text-xs text-slate-500">All figures from inception to date (all completed sales)</p>

            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-2 pl-2 text-left text-sm font-bold text-slate-900">Description</th>
                  <th className="py-2 pr-2 text-right text-sm font-bold text-slate-900">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-500">
                  <td colSpan={2} className="pt-3 pb-1 pl-2 text-xs font-semibold uppercase tracking-wider">Revenue</td>
                </tr>
                <LineItem label="Net Sales Revenue" value={data.total_revenue} indent positive />

                <tr className="text-slate-500">
                  <td colSpan={2} className="pt-3 pb-1 pl-2 text-xs font-semibold uppercase tracking-wider">Cost of Goods Sold</td>
                </tr>
                <LineItem label="Cost of Goods Sold (COGS)" value={data.total_cogs} indent positive={false} />

                <LineItem
                  label="Gross Profit"
                  value={data.gross_profit}
                  bold
                  separator
                  positive={grossProfit >= 0}
                />

                <tr className="text-slate-500">
                  <td colSpan={2} className="pt-3 pb-1 pl-2 text-xs font-semibold uppercase tracking-wider">Operating Expenses</td>
                </tr>
                <LineItem label="Total Expenses" value={data.total_expenses} indent positive={false} />

                <LineItem
                  label={netProfit >= 0 ? "Net Profit" : "Net Loss"}
                  value={data.net_profit}
                  bold
                  separator
                  positive={netProfit >= 0}
                />
              </tbody>
            </table>

            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <span className="font-medium text-slate-700">Gross Margin: </span>
              {parseFloat(data.total_revenue) > 0
                ? ((grossProfit / parseFloat(data.total_revenue)) * 100).toFixed(1) + "%"
                : "N/A"}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span className="font-medium text-slate-700">Net Margin: </span>
              {parseFloat(data.total_revenue) > 0
                ? ((netProfit / parseFloat(data.total_revenue)) * 100).toFixed(1) + "%"
                : "N/A"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}