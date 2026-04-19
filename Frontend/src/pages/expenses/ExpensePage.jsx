import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import { fetchFinancialAccounts, fetchChartOfAccounts } from "../../features/accounts/accountsSlice";
import { createExpense, fetchExpenses, setExpenseField } from "../../features/expenses/expensesSlice";
import { formatCurrency } from "../../utils/formatters";

export default function ExpensePage() {
  const dispatch = useDispatch();
  const { list, draft, submitting } = useSelector((state) => state.expenses);
  const { chartAccounts, financialAccounts } = useSelector((state) => state.accounts);
  const expenseAccounts = Array.isArray(chartAccounts) ? chartAccounts.filter((account) => account.account_type === "expense") : [];
  const accountOptions = Array.isArray(financialAccounts) ? financialAccounts : [];

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchChartOfAccounts());
    dispatch(fetchFinancialAccounts());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await dispatch(createExpense());
    dispatch(fetchExpenses());
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <form className="card space-y-4" onSubmit={handleSubmit}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Record operating expenses and post them to accounting.</p>
        </div>

        <div>
          <label className="label">Expense Date</label>
          <input type="date" value={draft.expense_date} onChange={(e) => dispatch(setExpenseField({ field: "expense_date", value: e.target.value }))} />
        </div>

        <div>
          <label className="label">Expense Account</label>
          <select value={draft.expense_category_account_id} onChange={(e) => dispatch(setExpenseField({ field: "expense_category_account_id", value: e.target.value }))}>
            <option value="">Select expense account</option>
            {expenseAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Paid From</label>
          <select value={draft.paid_from_account_id} onChange={(e) => dispatch(setExpenseField({ field: "paid_from_account_id", value: e.target.value }))}>
            <option value="">Select financial account</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Amount</label>
          <input value={draft.amount} onChange={(e) => dispatch(setExpenseField({ field: "amount", value: e.target.value }))} />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea value={draft.description} onChange={(e) => dispatch(setExpenseField({ field: "description", value: e.target.value }))} />
        </div>

        <button className="primary-btn" type="submit" disabled={submitting}>
          Save Expense
        </button>
      </form>

      <DataTable
        columns={[
          { key: "expense_date", title: "Date" },
          { key: "description", title: "Description" },
          { key: "amount", title: "Amount", render: (row) => formatCurrency(row.amount) },
          { key: "reference_number", title: "Reference" },
        ]}
        rows={list}
      />
    </div>
  );
}