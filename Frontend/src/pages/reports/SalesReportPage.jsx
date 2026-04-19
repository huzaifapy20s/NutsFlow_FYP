import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import { fetchSalesReport, setSalesPeriod } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function SalesReportPage() {
  const dispatch = useDispatch();
  const { salesReport, salesPeriod } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchSalesReport());
  }, [dispatch, salesPeriod]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Sales Report</h1>
        <p className="page-subtitle">Daily, monthly, and yearly sales summaries.</p>
      </div>

      <div className="card max-w-xs">
        <label className="label">Period</label>
        <select value={salesPeriod} onChange={(e) => dispatch(setSalesPeriod(e.target.value))}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <DataTable
        columns={[
          { key: "period", title: "Period" },
          { key: "total_sales", title: "Total Sales", render: (row) => formatCurrency(row.total_sales) },
        ]}
        rows={salesReport}
      />
    </div>
  );
}