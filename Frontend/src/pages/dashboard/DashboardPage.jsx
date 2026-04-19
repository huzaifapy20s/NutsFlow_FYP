import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";
import { fetchDashboardSummary, fetchLowStockItems } from "../../features/dashboard/dashboardSlice";
import { formatCurrency } from "../../utils/formatters";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { summary, lowStockItems } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
    dispatch(fetchLowStockItems());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Sales, payables, receivables, and stock alerts at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Today's Sales" value={formatCurrency(summary?.today_sales)} />
        <StatCard title="Monthly Sales" value={formatCurrency(summary?.month_sales)} />
        <StatCard title="Yearly Sales" value={formatCurrency(summary?.year_sales)} />
        <StatCard title="Receivables" value={formatCurrency(summary?.total_receivables)} />
        <StatCard title="Payables" value={formatCurrency(summary?.total_payables)} />
        <StatCard title="Low Stock Items" value={summary?.low_stock_count || 0} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Low Stock Alerts</h2>
        <DataTable
          columns={[
            { key: "item_name", title: "Item" },
            { key: "sku", title: "SKU" },
            { key: "stock_quantity", title: "Available" },
            { key: "low_stock_threshold", title: "Threshold" },
            { key: "unit", title: "Unit" },
          ]}
          rows={lowStockItems}
          emptyText="No low stock alerts."
        />
      </div>
    </div>
  );
}