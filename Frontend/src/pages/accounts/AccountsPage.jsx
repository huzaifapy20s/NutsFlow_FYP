import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import {
  fetchChartOfAccounts,
  fetchCustomerAccounts,
  fetchFinancialAccounts,
  fetchSupplierAccounts,
} from "../../features/accounts/accountsSlice";
import { formatCurrency } from "../../utils/formatters";

const buildLedgerState = (row, entityType) => ({
  entityType,
  account: {
    ...row,
    entity_type: entityType,
  },
});

export default function AccountsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { chartAccounts, customerAccounts, financialAccounts, supplierAccounts, loading, error } = useSelector(
    (state) => state.accounts,
  );

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

  const handleLedger = (row, forcedType = null) => {
    if (!row) return;

    const entityType = (forcedType || row.entity_type || "chart").toLowerCase();

    if (entityType === "customer") {
      navigate(`/accounts/general-ledger/${row.id}?type=customer`, {
        state: buildLedgerState(row, "customer"),
      });
      return;
    }

    if (entityType === "supplier") {
      navigate(`/accounts/general-ledger/${row.id}?type=supplier`, {
        state: buildLedgerState(row, "supplier"),
      });
      return;
    }

    const ledgerId = row.chart_account_id || row.id;

    navigate(`/accounts/general-ledger/${ledgerId}?type=chart`, {
      state: buildLedgerState(row, "chart"),
    });
  };

  const ledgerActionColumn = (type) => ({
    key: "ledger_action",
    title: "Ledger",
    render: (row) => (
      <button
        type="button"
        onClick={() => handleLedger(row, type)}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
      >
        View Ledger
      </button>
    ),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">Chart of accounts, cash/bank accounts, customer receivables, and supplier payables.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading accounts...</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chart of Accounts</h2>
            <p className="text-sm text-slate-600">Core accounting heads used for journal entries and reports.</p>
          </div>

          <DataTable
            columns={[
              { key: "account_code", title: "Code" },
              { key: "account_name", title: "Account Name" },
              {
                key: "account_type",
                title: "Type",
                render: (row) => <span className="capitalize">{row.account_type || "-"}</span>,
              },
              ledgerActionColumn("chart"),
            ]}
            rows={chartData}
            emptyText="No chart accounts found."
          />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Financial Accounts</h2>
            <p className="text-sm text-slate-600">Cash and bank accounts linked with chart of accounts.</p>
          </div>

          <DataTable
            columns={[
              { key: "account_name", title: "Financial Account" },
              {
                key: "account_type",
                title: "Type",
                render: (row) => <span className="capitalize">{row.account_type || "-"}</span>,
              },
              {
                key: "current_balance",
                title: "Balance",
                render: (row) => formatCurrency(row.current_balance),
              },
              ledgerActionColumn("chart"),
            ]}
            rows={financialData}
            emptyText="No financial accounts found."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Customer Asset Accounts</h2>
          <p className="text-sm text-slate-600">Customers are shown here as receivable accounts. Open their dedicated ledgers to see sales and payments.</p>
        </div>

        <DataTable
          columns={[
            { key: "account_name", title: "Customer Name" },
            {
              key: "account_type",
              title: "Type",
              render: (row) => <span className="capitalize">{row.account_type || "asset"}</span>,
            },
            {
              key: "current_balance",
              title: "Opening Balance",
              render: (row) => formatCurrency(row.current_balance),
            },
            ledgerActionColumn("customer"),
          ]}
          rows={customerData.map((row) => ({ ...row, entity_type: "customer" }))}
          emptyText="No customer accounts found."
        />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Supplier Liability Accounts</h2>
          <p className="text-sm text-slate-600">Suppliers are shown here as payable accounts. Open their dedicated ledgers to see purchases and payments.</p>
        </div>

        <DataTable
          columns={[
            { key: "account_name", title: "Supplier Name" },
            {
              key: "account_type",
              title: "Type",
              render: (row) => <span className="capitalize">{row.account_type || "liability"}</span>,
            },
            {
              key: "current_balance",
              title: "Opening Balance",
              render: (row) => formatCurrency(row.current_balance),
            },
            ledgerActionColumn("supplier"),
          ]}
          rows={supplierData.map((row) => ({ ...row, entity_type: "supplier" }))}
          emptyText="No supplier accounts found."
        />
      </div>
    </div>
  );
}
