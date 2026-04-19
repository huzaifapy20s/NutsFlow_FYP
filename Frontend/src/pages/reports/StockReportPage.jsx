import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import { fetchStockReport } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function StockReportPage() {
  const dispatch = useDispatch();
  const { stockReport } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchStockReport());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Stock Report</h1>
        <p className="page-subtitle">Current stock, thresholds, average cost, and retail price.</p>
      </div>

      <DataTable
        columns={[
          { key: "item_name", title: "Item" },
          { key: "sku", title: "SKU" },
          { key: "stock_quantity", title: "Stock" },
          { key: "average_cost", title: "Average Cost", render: (row) => formatCurrency(row.average_cost) },
          { key: "sale_price", title: "Sale Price", render: (row) => formatCurrency(row.sale_price) },
          { key: "is_low_stock", title: "Low Stock", render: (row) => (row.is_low_stock ? "Yes" : "No") },
        ]}
        rows={stockReport}
      />
    </div>
  );
}