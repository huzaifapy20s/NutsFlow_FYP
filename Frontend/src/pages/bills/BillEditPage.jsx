import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Info, Plus, Save, Trash2 } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { fetchCustomers } from "../../features/customers/customersSlice";
import { fetchFinancialAccounts } from "../../features/accounts/accountsSlice";
import { fetchItems } from "../../features/items/itemsSlice";
import { formatCurrency } from "../../utils/formatters";

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
        receipt_account_id: b.receipt_account_id != null ? String(b.receipt_account_id) : "",
        discount_amount: b.discount_amount != null ? String(b.discount_amount) : "0",
        tax_amount: b.tax_amount != null ? String(b.tax_amount) : "0",
        paid_amount: b.paid_amount != null ? String(b.paid_amount) : "0",
        payment_method: b.payment_method || "cash",
        notes: b.notes != null && b.notes !== undefined ? String(b.notes) : "",
      });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load bill.");
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
    return { discount: d, tax: t, total: tot >= 0 ? tot : 0, paidNum: pCapped, balanceDue: bal };
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
    setLineRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
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
      if (!linesValid) setError("Add at least one line with an item, quantity, and price.");
      else if (needsCustomer) setError("Select a customer when there is a balance due.");
      else if (needsReceipt) setError("Select a receipt account when payment is greater than zero.");
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
        receipt_account_id: form.receipt_account_id ? form.receipt_account_id : null,
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
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
          <span className="ml-3 text-slate-600">Loading bill…</span>
        </div>
      </div>
    );
  }

  if (!bill && error && !submitting) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Link to="/bills" className="text-slate-700 underline">
          Back to bills
        </Link>
      </div>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/bills/${billId}`}
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to bill
          </Link>
          <h1 className="page-title">Edit bill</h1>
          <p className="page-subtitle">
            Edit line quantities, items, and prices—stock and accounting follow automatically. You can also change
            discount, tax, payment, and customer. Balances and journals stay in sync.
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-mono text-slate-800">{bill.invoice_number}</p>
          <p>{new Date(bill.sale_date).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Info className="h-5 w-5 shrink-0" />
        <p>
          Changing lines <strong>returns old quantities to stock</strong> and <strong>deducts the new</strong> ones.
          Totals, customer balance, receipt account, and the sale journal are rebuilt to match. Ensure enough
          <strong> stock</strong> is available for new quantities.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Line items</h2>
              <button type="button" onClick={addLineRow} className="secondary-btn inline-flex items-center gap-1 py-1.5 text-sm">
                <Plus size={16} />
                Add line
              </button>
            </div>
            <p className="text-xs text-slate-500">At least one line required. Select item, quantity, and unit price.</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="w-24 px-2 py-2 font-medium">Stock</th>
                    <th className="w-28 px-2 py-2 font-medium">Qty</th>
                    <th className="w-32 px-2 py-2 font-medium">Unit price</th>
                    <th className="w-28 px-2 py-2 text-right font-medium">Line</th>
                    <th className="w-12 px-1 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineRows.map((row) => {
                    const it = itemList.find((i) => String(i.id) === String(row.item_id));
                    const line = Math.round((Number(row.quantity) || 0) * (Number(row.unit_price) || 0) * 100) / 100;
                    return (
                      <tr key={row.key}>
                        <td className="px-2 py-1.5">
                          <select
                            value={row.item_id}
                            onChange={(e) => onItemChange(row.key, e.target.value)}
                            className="w-full min-w-[160px] rounded border border-slate-200 p-1.5 text-sm"
                          >
                            <option value="">{itemList.length ? "Select item" : "Loading items…"}</option>
                            {itemList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.item_name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-slate-600">{it != null ? it.stock_quantity : "—"}</td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.quantity}
                            onChange={(e) => setLine(row.key, { quantity: e.target.value })}
                            className="w-full rounded border border-slate-200 p-1.5"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unit_price}
                            onChange={(e) => setLine(row.key, { unit_price: e.target.value })}
                            className="w-full rounded border border-slate-200 p-1.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-slate-900">{formatCurrency(line)}</td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineRow(row.key)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
          </div>

          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900">People &amp; payment</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Customer {needsCustomer ? <span className="text-red-600">*</span> : null}</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setField("customer_id", e.target.value)}
                  className="w-full rounded border border-slate-200 p-2"
                >
                  <option value="">Walk-in (no account)</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
                {needsCustomer ? (
                  <p className="mt-1 text-xs text-amber-800">Required while balance due is greater than zero.</p>
                ) : null}
              </div>
              <div>
                <label className="label">Receipt account {needsReceipt ? <span className="text-red-600">*</span> : null}</label>
                <select
                  value={form.receipt_account_id}
                  onChange={(e) => setField("receipt_account_id", e.target.value)}
                  className="w-full rounded border border-slate-200 p-2"
                >
                  <option value="">{accountList.length ? "Select where payment was received" : "No accounts"}</option>
                  {accountList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}
                    </option>
                  ))}
                </select>
                {needsReceipt ? (
                  <p className="mt-1 text-xs text-amber-800">Required when paid amount is greater than zero.</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="label">Payment method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setField("payment_method", e.target.value)}
                className="w-full max-w-md rounded border border-slate-200 p-2"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-200 p-2 text-sm"
                placeholder="Optional note on this sale…"
              />
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Amounts</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Discount amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(e) => setField("discount_amount", e.target.value)}
                  className="w-full rounded border border-slate-200 p-2"
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
                  className="w-full rounded border border-slate-200 p-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Paid amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(e) => setField("paid_amount", e.target.value)}
                  className="w-full max-w-md rounded border border-slate-200 p-2"
                />
                <p className="mt-1 text-xs text-slate-500">Cannot exceed the new total ({formatCurrency(total)}).</p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" className="secondary-btn" onClick={() => navigate(`/bills/${billId}`)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-btn inline-flex items-center gap-2" disabled={submitting || !canSubmit}>
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

        <aside className="space-y-4">
          <div className="card space-y-3 text-sm">
            <h2 className="text-base font-semibold text-slate-900">Summary (preview)</h2>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (from lines)</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>−{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>+{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Paid</span>
              <span className="text-green-700">{formatCurrency(paidNum)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-medium text-slate-800">Balance due</span>
              <span className={balanceDue > 0.001 ? "font-bold text-amber-800" : "font-bold text-green-700"}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-800">Original snapshot</p>
            <p className="mt-1">
              Invoice lines above replace this bill’s lines on save. Stock is adjusted by reversing the old sale
              movement and applying the new one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
