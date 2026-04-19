import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import StatCard from "../../components/common/StatCard";
import { fetchProfitLoss } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function ProfitLossPage() {
  const dispatch = useDispatch();
  const { profitLoss } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchProfitLoss());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Profit / Loss</h1>
        <p className="page-subtitle">Revenue, COGS, expenses, and net profit.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue" value={formatCurrency(profitLoss?.total_revenue)} />
        <StatCard title="COGS" value={formatCurrency(profitLoss?.total_cogs)} />
        <StatCard title="Expenses" value={formatCurrency(profitLoss?.total_expenses)} />
        <StatCard title="Net Profit" value={formatCurrency(profitLoss?.net_profit)} />
      </div>
    </div>
  );
}