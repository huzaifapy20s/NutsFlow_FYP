import { createElement, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Banknote,
  CalendarDays,
  FileText,
  Plus,
  ReceiptText,
  Save,
  WalletCards,
  X,
} from "lucide-react";
import {
  fetchFinancialAccounts,
  fetchChartOfAccounts,
} from "../../features/accounts/accountsSlice";
import {
  createExpense,
  fetchExpenses,
  setExpenseField,
} from "../../features/expenses/expensesSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function toNumber(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function ExpenseMetric({ title, value, helper, icon, accent = false }) {
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
          {icon ? createElement(icon, { size: 20, strokeWidth: 2 }) : null}
        </div>
      </div>
    </div>
  );
}

export default function ExpensePage() {
  const dispatch = useDispatch();
  const { list, draft, submitting, loading, error } = useSelector(
    (state) => state.expenses,
  );
  const { chartAccounts, financialAccounts } = useSelector(
    (state) => state.accounts,
  );
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const expenses = useMemo(() => (Array.isArray(list) ? list : []), [list]);
  const expenseAccounts = Array.isArray(chartAccounts)
    ? chartAccounts.filter((account) => account.account_type === "expense")
    : [];
  const accountOptions = Array.isArray(financialAccounts)
    ? financialAccounts
    : [];

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchChartOfAccounts());
    dispatch(fetchFinancialAccounts());
  }, [dispatch]);

  const expenseStats = useMemo(() => {
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + toNumber(expense.amount),
      0,
    );
    const todayKey = new Date().toISOString().slice(0, 7);
    const currentMonthAmount = expenses.reduce((sum, expense) => {
      const expenseMonth = String(expense.expense_date || "").slice(0, 7);
      return expenseMonth === todayKey ? sum + toNumber(expense.amount) : sum;
    }, 0);
    const largestExpense = expenses.reduce(
      (max, expense) => Math.max(max, toNumber(expense.amount)),
      0,
    );

    return { totalAmount, currentMonthAmount, largestExpense };
  }, [expenses]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(createExpense());
    dispatch(fetchExpenses());
    if (!result?.error) {
      setExpenseModalOpen(false);
    }
  };

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
              Expense Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Expenses
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Record operating expenses, select payment accounts, and review all
              posted expense entries in a clean workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total Expenses
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <WalletCards size={18} />
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(expenseStats.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExpenseMetric
          title="Total records"
          value={expenses.length}
          helper="Saved expense entries"
          icon={ReceiptText}
          accent
        />
        <ExpenseMetric
          title="This month"
          value={formatCurrency(expenseStats.currentMonthAmount)}
          helper="Current month spend"
          icon={CalendarDays}
        />
        <ExpenseMetric
          title="Largest expense"
          value={formatCurrency(expenseStats.largestExpense)}
          helper="Highest single entry"
          icon={Banknote}
        />
        <ExpenseMetric
          title="Expense accounts"
          value={expenseAccounts.length}
          helper="Available categories"
          icon={FileText}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Expense Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All saved expenses with dates, references, and amounts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              {expenses.length} records
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              onClick={() => setExpenseModalOpen(true)}
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Loading expenses...
            </p>
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">No.</th>
                  <th className="px-5 py-4 font-semibold">Expense</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Reference</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense, index) => (
                  <tr
                    key={expense.id || index}
                    className="bg-white transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 align-middle text-slate-500">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
                          <ReceiptText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[280px] truncate font-bold text-slate-950">
                            {expense.description || "Expense entry"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Expense ID: {expense.id || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />
                        {formatDate(expense.expense_date)}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-600">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {expense.reference_number || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right align-middle font-bold text-slate-950">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
              <ReceiptText size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-950">
              No expenses found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Record your first operating expense to see it here.
            </p>
          </div>
        )}
      </section>

      {expenseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            role="presentation"
            aria-hidden
            onClick={() => setExpenseModalOpen(false)}
          />
          <form
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: accentColor }}
            />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Expense Entry
                  </p>
                  <h2
                    id="expense-modal-title"
                    className="mt-1 text-xl font-bold text-slate-950"
                  >
                    Add Expense
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter expense details and post them to accounting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
                onClick={() => setExpenseModalOpen(false)}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Expense Date
                    </label>
                    <input
                      className="focus:border-[#ffcf83] focus:ring-[#ffcf83]/30"
                      type="date"
                      value={draft.expense_date}
                      onChange={(e) =>
                        dispatch(
                          setExpenseField({
                            field: "expense_date",
                            value: e.target.value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Amount
                    </label>
                    <input
                      className="focus:border-[#ffcf83] focus:ring-[#ffcf83]/30"
                      value={draft.amount}
                      onChange={(e) =>
                        dispatch(
                          setExpenseField({
                            field: "amount",
                            value: e.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Expense Account
                    </label>
                    <select
                      className="focus:border-[#ffcf83] focus:ring-[#ffcf83]/30"
                      value={draft.expense_category_account_id}
                      onChange={(e) =>
                        dispatch(
                          setExpenseField({
                            field: "expense_category_account_id",
                            value: e.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">Select expense account</option>
                      {expenseAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Paid From
                    </label>
                    <select
                      className="focus:border-[#ffcf83] focus:ring-[#ffcf83]/30"
                      value={draft.paid_from_account_id}
                      onChange={(e) =>
                        dispatch(
                          setExpenseField({
                            field: "paid_from_account_id",
                            value: e.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">Select financial account</option>
                      {accountOptions.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-32 focus:border-[#ffcf83] focus:ring-[#ffcf83]/30"
                    value={draft.description}
                    onChange={(e) =>
                      dispatch(
                        setExpenseField({
                          field: "description",
                          value: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setExpenseModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                ) : (
                  <Save size={16} />
                )}
                {submitting ? "Saving Expense..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
