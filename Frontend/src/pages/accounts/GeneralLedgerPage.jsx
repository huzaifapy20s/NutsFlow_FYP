import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  clearGeneralLedger,
  fetchCustomerLedger,
  fetchGeneralLedger,
  fetchSupplierLedger,
} from "../../features/accounts/accountsSlice";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
  ArrowLeft,
  BadgeDollarSign,
  BookOpen,
  DollarSign,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";

const accentColor = "#ffcf83";

const toNumber = (value) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getTypeLabel = (ledgerType) => {
  if (ledgerType === "customer") return "Customer Ledger";
  if (ledgerType === "supplier") return "Supplier Ledger";
  return "General Ledger";
};

const getBalanceLabel = (ledgerType) => {
  if (ledgerType === "customer") return "Outstanding Receivable";
  if (ledgerType === "supplier") return "Outstanding Payable";
  return "Closing Balance";
};

const getReferenceBadgeClass = (referenceType = "") => {
  const type = String(referenceType).toLowerCase();

  if (type.includes("sale")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (type.includes("purchase")) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (type.includes("payment")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (type.includes("opening")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
};

function LedgerMetric({ title, value, helper, icon: Icon, accent = false }) {
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

function AccountInfoCard({ account }) {
  if (!account) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        Ledger Account
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
          {account.entity_type === "customer" ? (
            <UserRound size={18} />
          ) : account.entity_type === "supplier" ? (
            <ReceiptText size={18} />
          ) : (
            <BookOpen size={18} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {account.account_name}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Code:{" "}
            <span className="font-semibold text-slate-200">
              {account.account_code || "—"}
            </span>
            {account.account_type ? (
              <>
                {" "}
                • Type:{" "}
                <span className="font-semibold capitalize text-slate-200">
                  {account.account_type}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GeneralLedgerPage() {
  const { accountId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { generalLedger, ledgerLoading, ledgerError } = useSelector(
    (state) => state.accounts,
  );

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const ledgerType = useMemo(() => {
    const stateType =
      location.state?.entityType || location.state?.account?.entity_type;
    const queryType =
      searchParams.get("type") || searchParams.get("entityType");
    const normalized = (stateType || queryType || "chart").toLowerCase();

    if (["customer", "supplier", "chart"].includes(normalized)) {
      return normalized;
    }

    return "chart";
  }, [location.state, searchParams]);

  useEffect(() => {
    if (!accountId) return;

    if (ledgerType === "customer") {
      dispatch(fetchCustomerLedger(accountId));
    } else if (ledgerType === "supplier") {
      dispatch(fetchSupplierLedger(accountId));
    } else {
      dispatch(fetchGeneralLedger(accountId));
    }

    return () => {
      dispatch(clearGeneralLedger());
    };
  }, [dispatch, accountId, ledgerType]);

  const account = generalLedger?.account || null;
  const entries = Array.isArray(generalLedger?.ledger_entries)
    ? generalLedger.ledger_entries
    : [];

  const totalDebit = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.debit), 0),
    [entries],
  );
  const totalCredit = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.credit), 0),
    [entries],
  );
  const closingBalance = useMemo(() => {
    if (!entries.length) return 0;
    return toNumber(entries[entries.length - 1]?.balance);
  }, [entries]);

  const pageTitle = getTypeLabel(account?.entity_type || ledgerType);
  const balanceLabel = getBalanceLabel(account?.entity_type || ledgerType);

  const subtitle = useMemo(() => {
    if (!account) {
      if (ledgerType === "customer") {
        return "Customer sales and payment history ledger.";
      }
      if (ledgerType === "supplier") {
        return "Supplier purchases and payment history ledger.";
      }
      return "Account transaction history with running balances.";
    }

    if (account.entity_type === "customer") {
      return "Shows invoices, received payments, and outstanding receivable balance for this customer.";
    }

    if (account.entity_type === "supplier") {
      return "Shows purchases, supplier payments, and outstanding payable balance for this supplier.";
    }

    return "Chart of account transaction history with debit, credit, and running balance.";
  }, [account, ledgerType]);

  const showRoutingHint =
    !location.state?.entityType &&
    !searchParams.get("type") &&
    !searchParams.get("entityType");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/70"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                Accounts Ledger
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {pageTitle}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            </div>
          </div>

          <AccountInfoCard account={account} />
        </div>
      </section>

      {showRoutingHint && ledgerType === "chart" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          For customer or supplier ledger, route should include entity type, for
          example:
          <span className="ml-1 font-semibold">?type=customer</span> or
          <span className="ml-1 font-semibold">?type=supplier</span>.
        </div>
      ) : null}

      {ledgerError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {ledgerError}
        </p>
      ) : null}
      {ledgerLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading ledger...
        </p>
      ) : null}

      {!ledgerLoading && !ledgerError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LedgerMetric
              title="Total Debit"
              value={formatCurrency(totalDebit)}
              helper="Debit side total"
              icon={TrendingUp}
              accent
            />

            <LedgerMetric
              title="Total Credit"
              value={formatCurrency(totalCredit)}
              helper="Credit side total"
              icon={TrendingDown}
            />

            <LedgerMetric
              title="Transactions"
              value={entries.length}
              helper="Ledger entries count"
              icon={BadgeDollarSign}
            />

            <LedgerMetric
              title={balanceLabel}
              value={formatCurrency(closingBalance)}
              helper="Latest running balance"
              icon={DollarSign}
            />
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Ledger Transactions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Debit, credit and running balance history for this account.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                {entries.length} entries
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-5 py-3 font-semibold">Reference</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Debit
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Credit
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Running Balance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                          <BookOpen size={22} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No ledger transactions found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      const debit = toNumber(entry.debit);
                      const credit = toNumber(entry.credit);
                      const balance = toNumber(entry.balance);
                      const isOpening =
                        String(entry.date).toLowerCase() === "opening";

                      return (
                        <tr
                          key={
                            entry.id ||
                            `${entry.reference_type}-${entry.reference_id}-${index}`
                          }
                          className="bg-white transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4 text-slate-400">
                            {index + 1}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                            {isOpening ? "Opening" : formatDate(entry.date)}
                          </td>
                          <td className="max-w-xs px-5 py-4 text-slate-800">
                            <span className="line-clamp-2">
                              {entry.description || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getReferenceBadgeClass(entry.reference_type)}`}
                            >
                              {entry.reference_type || "entry"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                            {debit > 0 ? formatCurrency(debit) : "—"}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-rose-600">
                            {credit > 0 ? formatCurrency(credit) : "—"}
                          </td>
                          <td
                            className={`px-5 py-4 text-right font-bold ${
                              balance >= 0 ? "text-slate-950" : "text-rose-600"
                            }`}
                          >
                            {formatCurrency(balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {entries.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-5 py-4 text-slate-700">
                        Totals
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-700">
                        {formatCurrency(totalDebit)}
                      </td>
                      <td className="px-5 py-4 text-right text-rose-600">
                        {formatCurrency(totalCredit)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right ${
                          closingBalance >= 0
                            ? "text-slate-950"
                            : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
