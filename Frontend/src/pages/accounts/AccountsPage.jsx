import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Landmark,
  Search,
  Truck,
  UsersRound,
  X,
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
  searchPlaceholder,
  searchFields = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const numberedRows = useMemo(
    () => rows.map((row, index) => ({ row, rowNumber: index + 1 })),
    [rows],
  );
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return numberedRows;

    const rowNumberMatch = normalizedSearch.match(/^(?:#|no\.?\s*)?(\d+)$/);
    if (rowNumberMatch) {
      const requestedRowNumber = Number(rowNumberMatch[1]);
      return numberedRows.filter(
        ({ rowNumber }) => rowNumber === requestedRowNumber,
      );
    }

    return numberedRows.filter(({ row, rowNumber }) => {
      const searchableText = [
        rowNumber,
        `#${rowNumber}`,
        ...searchFields.map((field) =>
          typeof field === "function" ? field(row) : row[field],
        ),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [numberedRows, searchFields, normalizedSearch]);

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
              className="no-native-search-clear h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-medium"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label={`Clear ${title} search`}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            {filteredRows.length}
            {normalizedSearch ? ` of ${rows.length}` : ""} records
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="w-[82px] px-5 py-3 font-semibold">No.</th>
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
            {filteredRows.length ? (
              filteredRows.map(({ row, rowNumber }, index) => (
                <tr
                  key={row.id || row.account_code || `${title}-${index}`}
                  className="bg-white transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4 align-middle text-slate-500">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                      {rowNumber}
                    </span>
                  </td>
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
                <td colSpan={columns.length + 1} className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                    <Icon size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {rows.length ? `No matching ${title.toLowerCase()} found.` : emptyText}
                  </p>
                  {rows.length ? (
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      onClick={() => setSearchTerm("")}
                    >
                      <X size={16} />
                      Clear Search
                    </button>
                  ) : null}
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
          searchPlaceholder="Search no, code, name, type..."
          searchFields={[
            "id",
            "account_code",
            "account_name",
            "account_type",
            "normal_balance",
          ]}
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
          searchPlaceholder="Search no, account, type, balance..."
          searchFields={[
            "id",
            "account_code",
            "account_name",
            "account_type",
            "current_balance",
            "chart_account_id",
          ]}
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
        searchPlaceholder="Search no, customer, type, balance..."
        searchFields={[
          "id",
          "account_code",
          "account_name",
          "account_type",
          "current_balance",
          "customer_name",
          "full_name",
          "phone",
          "email",
        ]}
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
        searchPlaceholder="Search no, supplier, type, balance..."
        searchFields={[
          "id",
          "account_code",
          "account_name",
          "account_type",
          "current_balance",
          "supplier_name",
          "contact_person",
          "phone",
          "email",
        ]}
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
