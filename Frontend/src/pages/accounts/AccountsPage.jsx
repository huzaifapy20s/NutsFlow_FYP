import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Landmark,
  Truck,
  UsersRound,
} from "lucide-react";
import {
  fetchChartOfAccounts,
  fetchCustomerAccounts,
  fetchFinancialAccounts,
  fetchSupplierAccounts,
} from "../../features/accounts/accountsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

const buildLedgerState = (row, entityType) => ({
  entityType,
  account: {
    ...row,
    entity_type: entityType,
  },
});

const toNumber = (value) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

function AccountMetric({ title, value, helper, icon: Icon, accent = false }) {
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
            accent
              ? "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ value, fallback = "account" }) {
  const label = value || fallback;

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
      {label}
    </span>
  );
}

function BalanceText({ value }) {
  const amount = toNumber(value);
  const isNegative = amount < 0;

  return (
    <span
      className={`font-semibold ${isNegative ? "text-rose-600" : "text-slate-950"}`}
    >
      {formatCurrency(amount)}
    </span>
  );
}

function LedgerButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/70"
    >
      View Ledger
      <ArrowUpRight size={14} />
    </button>
  );
}

function AccountSection({
  title,
  subtitle,
  rows,
  columns,
  emptyText,
  icon: Icon,
  countLabel,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          {countLabel || `${rows.length} records`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-3 font-semibold ${column.align === "right" ? "text-right" : ""}`}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={row.id || row.account_code || `${title}-${index}`}
                  className="bg-white transition hover:bg-slate-50/80"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 align-middle ${column.align === "right" ? "text-right" : ""}`}
                    >
                      {column.render
                        ? column.render(row, index)
                        : row[column.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                    <Icon size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {emptyText}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AccountsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    chartAccounts,
    customerAccounts,
    financialAccounts,
    supplierAccounts,
    loading,
    error,
  } = useSelector((state) => state.accounts);

  const chartData = Array.isArray(chartAccounts) ? chartAccounts : [];
  const customerData = Array.isArray(customerAccounts) ? customerAccounts : [];
  const financialData = Array.isArray(financialAccounts)
    ? financialAccounts
    : [];
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
    align: "right",
    render: (row) => <LedgerButton onClick={() => handleLedger(row, type)} />,
  });

  const customerRows = useMemo(
    () => customerData.map((row) => ({ ...row, entity_type: "customer" })),
    [customerData],
  );
  const supplierRows = useMemo(
    () => supplierData.map((row) => ({ ...row, entity_type: "supplier" })),
    [supplierData],
  );

  const financialTotal = useMemo(
    () =>
      financialData.reduce(
        (sum, account) => sum + toNumber(account.current_balance),
        0,
      ),
    [financialData],
  );
  const customerReceivable = useMemo(
    () =>
      customerRows.reduce(
        (sum, account) => sum + toNumber(account.current_balance),
        0,
      ),
    [customerRows],
  );
  const supplierPayable = useMemo(
    () =>
      supplierRows.reduce(
        (sum, account) => sum + toNumber(account.current_balance),
        0,
      ),
    [supplierRows],
  );

  const accountNameCell = (row, fallback = "—") => (
    <div>
      <p className="font-semibold text-slate-950">
        {row.account_name || fallback}
      </p>
      {row.account_code ? (
        <p className="mt-1 text-xs font-medium text-slate-500">
          Code: {row.account_code}
        </p>
      ) : null}
    </div>
  );

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
              Finance Control
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Accounts
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Chart of accounts, cash/bank accounts, customer receivables, and
              supplier payables in one clean workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Account Records
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <BookOpen size={18} />
              </div>
              <p className="text-2xl font-bold text-white">
                {chartData.length +
                  financialData.length +
                  customerRows.length +
                  supplierRows.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountMetric
          title="Chart accounts"
          value={chartData.length}
          helper="Core accounting heads"
          icon={BookOpen}
          accent
        />
        <AccountMetric
          title="Cash / Bank"
          value={formatCurrency(financialTotal)}
          helper={`${financialData.length} financial accounts`}
          icon={Landmark}
        />
        <AccountMetric
          title="Receivables"
          value={formatCurrency(customerReceivable)}
          helper={`${customerRows.length} customer accounts`}
          icon={UsersRound}
        />
        <AccountMetric
          title="Payables"
          value={formatCurrency(supplierPayable)}
          helper={`${supplierRows.length} supplier accounts`}
          icon={Truck}
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading accounts...
        </p>
      ) : null}

      <div className="space-y-6">
        <AccountSection
          title="Chart of Accounts"
          subtitle="Core accounting heads used for journal entries and reports."
          rows={chartData}
          icon={BookOpen}
          emptyText="No chart accounts found."
          columns={[
            {
              key: "account_code",
              title: "Code",
              render: (row) => (
                <span className="font-semibold text-slate-700">
                  {row.account_code || "—"}
                </span>
              ),
            },
            {
              key: "account_name",
              title: "Account Name",
              render: (row) => accountNameCell(row),
            },
            {
              key: "account_type",
              title: "Type",
              render: (row) => <TypeBadge value={row.account_type} />,
            },
            ledgerActionColumn("chart"),
          ]}
        />

        <AccountSection
          title="Financial Accounts"
          subtitle="Cash and bank accounts linked with chart of accounts."
          rows={financialData}
          icon={Landmark}
          emptyText="No financial accounts found."
          columns={[
            {
              key: "account_name",
              title: "Financial Account",
              render: (row) => accountNameCell(row),
            },
            {
              key: "account_type",
              title: "Type",
              render: (row) => <TypeBadge value={row.account_type} />,
            },
            {
              key: "current_balance",
              title: "Balance",
              align: "right",
              render: (row) => <BalanceText value={row.current_balance} />,
            },
            ledgerActionColumn("chart"),
          ]}
        />
      </div>

      <AccountSection
        title="Customer Asset Accounts"
        subtitle="Customers are shown here as receivable accounts. Open their dedicated ledgers to see sales and payments."
        rows={customerRows}
        icon={UsersRound}
        emptyText="No customer accounts found."
        columns={[
          {
            key: "account_name",
            title: "Customer Name",
            render: (row) => accountNameCell(row),
          },
          {
            key: "account_type",
            title: "Type",
            render: (row) => (
              <TypeBadge value={row.account_type} fallback="asset" />
            ),
          },
          {
            key: "current_balance",
            title: "Opening Balance",
            align: "right",
            render: (row) => <BalanceText value={row.current_balance} />,
          },
          ledgerActionColumn("customer"),
        ]}
      />

      <AccountSection
        title="Supplier Liability Accounts"
        subtitle="Suppliers are shown here as payable accounts. Open their dedicated ledgers to see purchases and payments."
        rows={supplierRows}
        icon={Truck}
        emptyText="No supplier accounts found."
        columns={[
          {
            key: "account_name",
            title: "Supplier Name",
            render: (row) => accountNameCell(row),
          },
          {
            key: "account_type",
            title: "Type",
            render: (row) => (
              <TypeBadge value={row.account_type} fallback="liability" />
            ),
          },
          {
            key: "current_balance",
            title: "Opening Balance",
            align: "right",
            render: (row) => <BalanceText value={row.current_balance} />,
          },
          ledgerActionColumn("supplier"),
        ]}
      />
    </div>
  );
}
