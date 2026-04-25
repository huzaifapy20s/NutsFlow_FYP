import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Info, Plus, Save, Trash2 } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { fetchCustomers } from "../../features/customers/customersSlice";
import { fetchFinancialAccounts } from "../../features/accounts/accountsSlice";
import { fetchItems } from "../../features/items/itemsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

const emptyForm = {
  customer_id: "",
  receipt_account_id: "",
  discount_amount: "",
  tax_amount: "",
  paid_amount: "",
  payment_method: "cash",
  notes: "",
};

export default function BillEditPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: customers } = useSelector((s) => s.customers);
  const { financialAccounts } = useSelector((s) => s.accounts);
  const { list: items } = useSelector((s) => s.items);
  const customerList = Array.isArray(customers) ? customers : [];
  const accountList = Array.isArray(financialAccounts) ? financialAccounts : [];
  const itemList = Array.isArray(items) ? items : [];

  const [bill, setBill] = useState(null);
  const [lineRows, setLineRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadBill = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/api/sales/${billId}`);
      const b = data.data;
      setBill(b);
      setLineRows(
        (b.sale_items || []).map((r, i) => ({
          key: `line-${r.id}-${i}`,
          item_id: String(r.item_id),
          quantity: String(r.quantity),
          unit_price: String(r.unit_price),
        })),
      );
      setForm({
        customer_id: b.customer_id != null ? String(b.customer_id) : "",
        receipt_account_id:
          b.receipt_account_id != null ? String(b.receipt_account_id) : "",
        discount_amount:
          b.discount_amount != null ? String(b.discount_amount) : "0",
        tax_amount: b.tax_amount != null ? String(b.tax_amount) : "0",
        paid_amount: b.paid_amount != null ? String(b.paid_amount) : "0",
        payment_method: b.payment_method || "cash",
        notes: b.notes != null && b.notes !== undefined ? String(b.notes) : "",
      });
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Failed to load bill.",
      );
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchFinancialAccounts());
    const itemsPromise = dispatch(fetchItems());
    return () => {
      itemsPromise.abort();
    };
  }, [dispatch]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  const subtotal = useMemo(() => {
    let cents = 0;
    for (const row of lineRows) {
      const q = Number(row.quantity) || 0;
      const p = Number(row.unit_price) || 0;
      cents += Math.round(q * p * 100);
    }
    return cents / 100;
  }, [lineRows]);

  const { discount, tax, total, paidNum, balanceDue } = useMemo(() => {
    const d = Math.max(0, Number(form.discount_amount) || 0);
    const t = Math.max(0, Number(form.tax_amount) || 0);
    const tot = Math.round((subtotal - d + t) * 100) / 100;
    const p = Math.max(0, Number(form.paid_amount) || 0);
    const pCapped = tot >= 0 ? Math.min(p, tot) : 0;
    const bal = Math.max(0, Math.round((tot - pCapped) * 100) / 100);
    return {
      discount: d,
      tax: t,
      total: tot >= 0 ? tot : 0,
      paidNum: pCapped,
      balanceDue: bal,
    };
  }, [subtotal, form.discount_amount, form.tax_amount, form.paid_amount]);

  const needsCustomer = balanceDue > 0.001;
  const needsReceipt = paidNum > 0.001;
  const linesValid =
    lineRows.length > 0 &&
    lineRows.every((r) => {
      const iid = Number(r.item_id);
      return (
        String(r.item_id).trim() !== "" &&
        Number.isFinite(iid) &&
        iid > 0 &&
        Number(r.quantity) > 0 &&
        Number(r.unit_price) > 0
      );
    });
  const canSubmit =
    linesValid &&
    (!needsCustomer || String(form.customer_id).trim() !== "") &&
    (!needsReceipt || String(form.receipt_account_id).trim() !== "") &&
    total >= 0;

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError(null);
  };

  const setLine = (key, updates) => {
    setLineRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...updates } : r)),
    );
    if (error) setError(null);
  };

  const addLineRow = () => {
    setLineRows((rows) => [
      ...rows,
      { key: `new-${Date.now()}`, item_id: "", quantity: "1", unit_price: "0" },
    ]);
  };

  const removeLineRow = (key) => {
    setLineRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.key !== key),
    );
  };

  const onItemChange = (key, itemId) => {
    const it = itemList.find((i) => String(i.id) === String(itemId));
    setLine(key, {
      item_id: String(itemId),
      unit_price: it ? String(it.sale_price) : "0",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!linesValid)
        setError("Add at least one line with an item, quantity, and price.");
      else if (needsCustomer)
        setError("Select a customer when there is a balance due.");
      else if (needsReceipt)
        setError("Select a receipt account when payment is greater than zero.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const sale_items = lineRows.map((r) => ({
        item_id: parseInt(r.item_id, 10),
        quantity: String(r.quantity),
        unit_price: String(r.unit_price),
      }));
      const payload = {
        sale_items,
        discount_amount: String(Number(form.discount_amount) || 0),
        tax_amount: String(Number(form.tax_amount) || 0),
        paid_amount: String(paidNum),
        payment_method: form.payment_method,
        notes: form.notes,
        customer_id: form.customer_id ? form.customer_id : null,
        receipt_account_id: form.receipt_account_id
          ? form.receipt_account_id
          : null,
      };
      await axiosClient.put(`/api/sales/${billId}`, payload);
      await dispatch(fetchItems()).unwrap();
      navigate(`/bills/${billId}`);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading bill…
          </p>
        </div>
      </div>
    );
  }

  if (!bill && error && !submitting) {
    return (
      <div className="p-6">
        <div className="max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="text-sm font-semibold">{error}</p>
          <Link
            to="/bills"
            className="mt-3 inline-flex text-sm font-semibold text-slate-800 underline"
          >
            Back to bills
          </Link>
        </div>
      </div>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to={`/bills/${billId}`}
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft size={16} />
              Back to bill
            </Link>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              Update Bill
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Edit bill
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Update saved bill lines, customer, payment and totals. Stock,
              balances and journals continue to follow the existing update flow.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Invoice
            </p>
            <p className="mt-2 font-mono text-lg font-bold text-white">
              {bill.invoice_number}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(bill.sale_date).toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Subtotal
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(subtotal)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Calculated from line items
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Discount
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(discount)}
          </p>
          <p className="mt-2 text-sm text-slate-500">Manual adjustment</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(total)}
          </p>
          <p className="mt-2 text-sm text-slate-500">After discount and tax</p>
        </div>
        <div className="rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/20 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            Balance due
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatCurrency(balanceDue)}
          </p>
          <p className="mt-2 text-sm text-slate-600">Based on paid amount</p>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <Info className="h-5 w-5 shrink-0" />
        <p>
          Changing lines <strong>returns old quantities to stock</strong> and{" "}
          <strong>deducts the new</strong> ones. Totals, customer balance,
          receipt account, and the sale journal are rebuilt by the existing bill
          update logic.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Line items
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  At least one line is required. Select item, quantity and unit
                  price.
                </p>
              </div>
              <button
                type="button"
                onClick={addLineRow}
                className="secondary-btn inline-flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Unit price</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Line total
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineRows.map((row) => {
                    const it = itemList.find(
                      (i) => String(i.id) === String(row.item_id),
                    );
                    const line =
                      Math.round(
                        (Number(row.quantity) || 0) *
                          (Number(row.unit_price) || 0) *
                          100,
                      ) / 100;
                    return (
                      <tr
                        key={row.key}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3">
                          <select
                            value={row.item_id}
                            onChange={(e) =>
                              onItemChange(row.key, e.target.value)
                            }
                            className="w-full min-w-[190px] rounded-xl border border-slate-200 bg-white p-2 text-sm focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                          >
                            <option value="">
                              {itemList.length
                                ? "Select item"
                                : "Loading items…"}
                            </option>
                            {itemList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.item_name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">
                          {it != null ? it.stock_quantity : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.quantity}
                            onChange={(e) =>
                              setLine(row.key, { quantity: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 p-2 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unit_price}
                            onChange={(e) =>
                              setLine(row.key, { unit_price: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 p-2 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-950">
                          {formatCurrency(line)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineRow(row.key)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Remove line"
                            disabled={lineRows.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">
              People & payment
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Customer and receipt account requirements stay unchanged.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">
                  Customer{" "}
                  {needsCustomer ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setField("customer_id", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                >
                  <option value="">Walk-in (no account)</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
                {needsCustomer ? (
                  <p className="mt-1 text-xs text-amber-800">
                    Required while balance due is greater than zero.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="label">
                  Receipt account{" "}
                  {needsReceipt ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </label>
                <select
                  value={form.receipt_account_id}
                  onChange={(e) =>
                    setField("receipt_account_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                >
                  <option value="">
                    {accountList.length
                      ? "Select where payment was received"
                      : "No accounts"}
                  </option>
                  {accountList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}
                    </option>
                  ))}
                </select>
                {needsReceipt ? (
                  <p className="mt-1 text-xs text-amber-800">
                    Required when paid amount is greater than zero.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="label">Payment method</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setField("payment_method", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Paid amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(e) => setField("paid_amount", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Cannot exceed the new total ({formatCurrency(total)}).
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                  placeholder="Optional note on this sale…"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">Amounts</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Discount amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(e) => setField("discount_amount", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                />
              </div>
              <div>
                <label className="label">Tax amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_amount}
                  onChange={(e) => setField("tax_amount", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 focus:border-[#ffcf83] focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/40"
                />
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate(`/bills/${billId}`)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn inline-flex items-center gap-2"
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                "Saving…"
              ) : (
                <>
                  <Save size={16} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className="h-1 w-full"
              style={{ backgroundColor: accentColor }}
            />
            <div className="p-5 text-sm">
              <h2 className="text-base font-bold text-slate-950">
                Summary preview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Live totals before saving changes.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-950">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>+{formatCurrency(tax)}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex justify-between font-bold text-slate-950">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Paid
                    </p>
                    <p className="mt-1 font-bold text-emerald-700">
                      {formatCurrency(paidNum)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Balance
                    </p>
                    <p
                      className={
                        balanceDue > 0.001
                          ? "mt-1 font-bold text-amber-800"
                          : "mt-1 font-bold text-emerald-700"
                      }
                    >
                      {formatCurrency(balanceDue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs leading-5 text-slate-600">
            <p className="font-semibold text-slate-800">Original snapshot</p>
            <p className="mt-1">
              Invoice lines above replace this bill’s lines on save. Stock is
              adjusted by reversing the old sale movement and applying the new
              one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
