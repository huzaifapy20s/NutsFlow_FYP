import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import { fetchChartOfAccounts, fetchCustomerAccounts, fetchFinancialAccounts, fetchSupplierAccounts } from "../../features/accounts/accountsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function AccountsPage() {
  const dispatch = useDispatch();
  const { chartAccounts, customerAccounts, financialAccounts, supplierAccounts, loading, error } = useSelector((state) => state.accounts);
  const chartData = Array.isArray(chartAccounts) ? chartAccounts : [];
  const customerData = Array.isArray(customerAccounts) ? customerAccounts : [];
  const financialData = Array.isArray(financialAccounts) ? financialAccounts : [];
  const supplierData = Array.isArray(supplierAccounts) ? supplierAccounts : [];

  useEffect(() => {
    dispatch(fetchChartOfAccounts());
    dispatch(fetchFinancialAccounts());
    dispatch(fetchCustomerAccounts());
    dispatch(fetchSupplierAccounts());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">Chart of accounts and operational cash/bank accounts.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading accounts...</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          columns={[
            { key: "account_code", title: "Code" },
            { key: "account_name", title: "Account Name" },
            { key: "account_type", title: "Type" },
          ]}
          rows={chartData}
        />

        <DataTable
          columns={[
            { key: "account_name", title: "Financial Account" },
            { key: "account_type", title: "Type" },
            { key: "current_balance", title: "Balance", render: (row) => formatCurrency(row.current_balance) },
          ]}
          rows={financialData}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Customer Asset Accounts</h2>
        <p className="text-sm text-slate-600 mb-4">All customers from the customer page are shown here as asset accounts.</p>
        <DataTable
          columns={[
            { key: "account_name", title: "Customer Name" },
            { key: "account_type", title: "Type" },
            { key: "current_balance", title: "Opening Balance", render: (row) => formatCurrency(row.current_balance) },
          ]}
          rows={customerData}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Supplier Liability Accounts</h2>
        <p className="text-sm text-slate-600 mb-4">All suppliers from the supplier page are shown here as liability accounts.</p>
        <DataTable
          columns={[
            { key: "account_name", title: "Supplier Name" },
            { key: "account_type", title: "Type" },
            { key: "current_balance", title: "Opening Balance", render: (row) => formatCurrency(row.current_balance) },
          ]}
          rows={supplierData}
        />
      </div>
    </div>
  );
}