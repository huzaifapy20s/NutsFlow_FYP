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

  if (type.includes("sale")) return "bg-green-100 text-green-700";
  if (type.includes("purchase")) return "bg-orange-100 text-orange-700";
  if (type.includes("payment")) return "bg-blue-100 text-blue-700";
  if (type.includes("opening")) return "bg-purple-100 text-purple-700";

  return "bg-slate-100 text-slate-600";
};

export default function GeneralLedgerPage() {
  const { accountId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { generalLedger, ledgerLoading, ledgerError } = useSelector((state) => state.accounts);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const ledgerType = useMemo(() => {
    const stateType = location.state?.entityType || location.state?.account?.entity_type;
    const queryType = searchParams.get("type") || searchParams.get("entityType");
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
  const entries = Array.isArray(generalLedger?.ledger_entries) ? generalLedger.ledger_entries : [];

  const totalDebit = useMemo(() => entries.reduce((sum, entry) => sum + toNumber(entry.debit), 0), [entries]);
  const totalCredit = useMemo(() => entries.reduce((sum, entry) => sum + toNumber(entry.credit), 0), [entries]);
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

  const showRoutingHint = !location.state?.entityType && !searchParams.get("type") && !searchParams.get("entityType");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>

        {account && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 text-slate-800">
              {account.entity_type === "customer" ? (
                <UserRound size={16} className="text-green-600" />
              ) : account.entity_type === "supplier" ? (
                <ReceiptText size={16} className="text-orange-600" />
              ) : (
                <BookOpen size={16} className="text-blue-600" />
              )}
              <span className="font-semibold">{account.account_name}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Code: <span className="font-medium text-slate-700">{account.account_code || "-"}</span>
              {account.account_type ? (
                <>
                  {" "}
                  • Type: <span className="font-medium capitalize text-slate-700">{account.account_type}</span>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {showRoutingHint && (ledgerType === "chart") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          For customer or supplier ledger, route should include entity type, for example:
          <span className="ml-1 font-semibold">?type=customer</span> or
          <span className="ml-1 font-semibold">?type=supplier</span>.
        </div>
      )}

      {ledgerError ? <p className="text-sm text-red-600">{ledgerError}</p> : null}
      {ledgerLoading ? <p className="text-sm text-slate-500">Loading ledger...</p> : null}

      {!ledgerLoading && !ledgerError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Debit</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(totalDebit)}</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-red-100 p-3">
                <TrendingDown size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Credit</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalCredit)}</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="rounded-xl bg-blue-100 p-3">
                <BadgeDollarSign size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p>
                <p className="text-lg font-bold text-slate-900">{entries.length}</p>
              </div>
            </div>

            <div
              className={`card flex items-center gap-4 ${closingBalance >= 0 ? "border-l-4 border-l-slate-900" : "border-l-4 border-l-red-500"}`}
            >
              <div className={`rounded-xl p-3 ${closingBalance >= 0 ? "bg-slate-100" : "bg-red-100"}`}>
                <DollarSign size={20} className={closingBalance >= 0 ? "text-slate-700" : "text-red-700"} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{balanceLabel}</p>
                <p className={`text-lg font-bold ${closingBalance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  {formatCurrency(closingBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 text-right font-semibold">Debit</th>
                  <th className="px-4 py-3 text-right font-semibold">Credit</th>
                  <th className="px-4 py-3 text-right font-semibold">Running Balance</th>
                </tr>
              </thead>

              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, index) => {
                    const debit = toNumber(entry.debit);
                    const credit = toNumber(entry.credit);
                    const balance = toNumber(entry.balance);
                    const isOpening = String(entry.date).toLowerCase() === "opening";

                    return (
                      <tr
                        key={entry.id || `${entry.reference_type}-${entry.reference_id}-${index}`}
                        className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                          {isOpening ? "Opening" : formatDate(entry.date)}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-slate-800">
                          <span className="line-clamp-2">{entry.description || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getReferenceBadgeClass(entry.reference_type)}`}>
                            {entry.reference_type || "entry"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">
                          {debit > 0 ? formatCurrency(debit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          {credit > 0 ? formatCurrency(credit) : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                          {formatCurrency(balance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {entries.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-slate-700">Totals</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totalCredit)}</td>
                    <td className={`px-4 py-3 text-right ${closingBalance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                      {formatCurrency(closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
