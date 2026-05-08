import { createElement, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  clearGeneralLedger,
  clearJournalEntryStatus,
  createGeneralJournalEntry,
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
  Loader2,
  NotebookPen,
  ReceiptText,
  Save,
  Search,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
  XCircle,
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
  if (type.includes("journal") || type.includes("manual")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
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
          {Icon ? createElement(Icon, { size: 20, strokeWidth: 2 }) : null}
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


function GeneralJournalEntryModal({
  account,
  ledgerType,
  form,
  onChange,
  onClose,
  onSubmit,
  saving,
  error,
  balanceLabel,
  closingBalance,
}) {
  if (!account) return null;

  const activeType = account.entity_type || ledgerType;
  const nameLabel =
    activeType === "customer"
      ? "Customer Name"
      : activeType === "supplier"
        ? "Supplier Name"
        : "Account Name";

  const scenarioHint = (() => {
    if (activeType === "customer") {
      return "Credit reduces the customer's balance due. Debit increases the customer's receivable balance.";
    }
    if (activeType === "supplier") {
      return "Debit reduces the supplier payable balance. Credit increases the supplier payable balance.";
    }
    return "Debit or credit is posted to this selected account with a balanced offset journal line.";
  })();

  const handleFieldChange = (field, value) => {
    onChange((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              Manual Ledger Posting
            </div>
            <h3 className="text-2xl font-bold text-slate-950">
              General Journal Entry
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {scenarioHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close general journal entry modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Entry Type
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["credit", "debit"].map((side) => {
                const selected = form.side === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => handleFieldChange("side", side)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold capitalize transition focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/70 ${
                      selected
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {side}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {nameLabel}
              </span>
              <input
                type="text"
                value={account.account_name || ""}
                readOnly
                className="mt-2 h-11 w-full rounded-xl border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => handleFieldChange("amount", event.target.value)}
                placeholder="Enter amount"
                className="mt-2 h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:border-slate-900 focus:ring-[#ffcf83]/70"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
              placeholder="Describe this journal entry"
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 focus:border-slate-900 focus:ring-[#ffcf83]/70"
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{balanceLabel}:</span>{" "}
            {formatCurrency(closingBalance)}
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GeneralLedgerPage() {
  const { accountId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({
    side: "debit",
    amount: "",
    description: "",
  });

  const {
    generalLedger,
    ledgerLoading,
    ledgerError,
    journalEntrySaving,
    journalEntryError,
  } = useSelector((state) => state.accounts);

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

  const defaultJournalSide = useMemo(() => {
    if (ledgerType === "customer") return "credit";
    if (ledgerType === "supplier") return "debit";
    return "debit";
  }, [ledgerType]);

  useEffect(() => {
    dispatch(clearJournalEntryStatus());
  }, [dispatch, accountId, defaultJournalSide]);

  const reloadLedger = () => {
    if (!accountId) return;

    if (ledgerType === "customer") {
      dispatch(fetchCustomerLedger(accountId));
    } else if (ledgerType === "supplier") {
      dispatch(fetchSupplierLedger(accountId));
    } else {
      dispatch(fetchGeneralLedger(accountId));
    }
  };

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
  const entries = useMemo(
    () => (Array.isArray(generalLedger?.ledger_entries) ? generalLedger.ledger_entries : []),
    [generalLedger],
  );

  const totalDebit = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.debit), 0),
    [entries],
  );
  const totalCredit = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.credit), 0),
    [entries],
  );
  const normalizedTransactionSearch = transactionSearchTerm.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedTransactionSearch) return entries;

    return entries.filter((entry) => {
      const isOpening = String(entry.date).toLowerCase() === "opening";
      const formattedDate = isOpening ? "Opening" : formatDate(entry.date);
      const searchableText = [
        entry.id,
        entry.date,
        formattedDate,
        entry.description,
        entry.reference_type,
        entry.reference_id,
        entry.debit,
        entry.credit,
        entry.balance,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedTransactionSearch);
    });
  }, [entries, normalizedTransactionSearch]);
  const filteredDebit = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + toNumber(entry.debit), 0),
    [filteredEntries],
  );
  const filteredCredit = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + toNumber(entry.credit), 0),
    [filteredEntries],
  );
  const filteredClosingBalance = useMemo(() => {
    if (!filteredEntries.length) return 0;
    return toNumber(filteredEntries[filteredEntries.length - 1]?.balance);
  }, [filteredEntries]);
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

  const openJournalModal = () => {
    dispatch(clearJournalEntryStatus());
    setJournalForm({ side: defaultJournalSide, amount: "", description: "" });
    setJournalModalOpen(true);
  };

  const closeJournalModal = () => {
    if (journalEntrySaving) return;
    dispatch(clearJournalEntryStatus());
    setJournalModalOpen(false);
  };

  const handleJournalSubmit = async (event) => {
    event.preventDefault();

    const result = await dispatch(
      createGeneralJournalEntry({
        ledger_type: account?.entity_type || ledgerType,
        entity_id: account?.id || Number(accountId),
        account_id: account?.id || Number(accountId),
        side: journalForm.side,
        amount: journalForm.amount,
        description: journalForm.description,
      }),
    );

    if (createGeneralJournalEntry.fulfilled.match(result)) {
      setJournalModalOpen(false);
      setJournalForm({ side: defaultJournalSide, amount: "", description: "" });
      reloadLedger();
    }
  };

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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={openJournalModal}
                  disabled={!account}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <NotebookPen size={16} />
                  General Journal Entry
                </button>
                <div className="relative w-full sm:w-80">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={transactionSearchTerm}
                    onChange={(event) =>
                      setTransactionSearchTerm(event.target.value)
                    }
                    placeholder="Search date, reference, amount..."
                    className="no-native-search-clear h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-medium"
                  />
                  {transactionSearchTerm ? (
                    <button
                      type="button"
                      onClick={() => setTransactionSearchTerm("")}
                      aria-label="Clear ledger transaction search"
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
                  {filteredEntries.length}
                  {normalizedTransactionSearch ? ` of ${entries.length}` : ""} entries
                </div>
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
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                          <BookOpen size={22} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          {entries.length
                            ? "No matching ledger transactions found."
                            : "No ledger transactions found."}
                        </p>
                        {entries.length ? (
                          <button
                            type="button"
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            onClick={() => setTransactionSearchTerm("")}
                          >
                            <X size={16} />
                            Clear Search
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry, index) => {
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

                {filteredEntries.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-5 py-4 text-slate-700">
                        {normalizedTransactionSearch ? "Filtered Totals" : "Totals"}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-700">
                        {formatCurrency(
                          normalizedTransactionSearch ? filteredDebit : totalDebit,
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-rose-600">
                        {formatCurrency(
                          normalizedTransactionSearch ? filteredCredit : totalCredit,
                        )}
                      </td>
                      <td
                        className={`px-5 py-4 text-right ${
                          (normalizedTransactionSearch
                            ? filteredClosingBalance
                            : closingBalance) >= 0
                            ? "text-slate-950"
                            : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(
                          normalizedTransactionSearch
                            ? filteredClosingBalance
                            : closingBalance,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </>
      )}

      {journalModalOpen ? (
        <GeneralJournalEntryModal
          account={account}
          ledgerType={ledgerType}
          form={journalForm}
          onChange={setJournalForm}
          onClose={closeJournalModal}
          onSubmit={handleJournalSubmit}
          saving={journalEntrySaving}
          error={journalEntryError}
          balanceLabel={balanceLabel}
          closingBalance={closingBalance}
        />
      ) : null}
    </div>
  );
}
