import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBestSelling } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";
import { Trophy } from "lucide-react";

export default function BestSellingPage() {
  const dispatch = useDispatch();
  const { bestSelling, loading, error } = useSelector((state) => state.reports);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    dispatch(fetchBestSelling(limit));
  }, [dispatch, limit]);

  const safeData = Array.isArray(bestSelling) ? bestSelling : [];

  // Top performer
  const topProduct = safeData[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Best Selling Products</h1>
          <p className="page-subtitle">Products ranked by total quantity sold from completed sales.</p>
        </div>

        {/* Limit selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Show top</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading...</p>}

      {/* Highlight top product */}
      {topProduct && !loading && (
        <div className="card flex items-center gap-4 border-l-4 border-l-yellow-400 bg-yellow-50">
          <div className="rounded-xl bg-yellow-100 p-3">
            <Trophy size={22} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Top Seller</p>
            <p className="text-lg font-bold text-slate-900">{topProduct.item_name}</p>
            <p className="text-sm text-slate-600">
              {topProduct.total_quantity_sold} units sold &nbsp;•&nbsp; {formatCurrency(topProduct.total_sales_amount)} total revenue
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold text-right">Quantity Sold</th>
              <th className="px-4 py-3 font-semibold text-right">Total Sales Amount</th>
            </tr>
          </thead>
          <tbody>
            {safeData.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No sales data available.
                </td>
              </tr>
            ) : (
              safeData.map((row, idx) => (
                <tr
                  key={row.item_id || idx}
                  className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${idx === 0 ? "bg-yellow-50/40" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? "bg-yellow-400 text-white"
                        : idx === 1
                        ? "bg-slate-300 text-slate-700"
                        : idx === 2
                        ? "bg-orange-300 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.item_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {parseFloat(row.total_quantity_sold).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                    {formatCurrency(row.total_sales_amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}