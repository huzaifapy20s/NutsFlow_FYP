import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchItems } from "../../features/items/itemsSlice";
import { fetchCustomers } from "../../features/customers/customersSlice";
import { fetchFinancialAccounts } from "../../features/accounts/accountsSlice";
import {
  addToCart,
  clearCart,
  removeFromCart,
  setPosField,
  submitSale,
  subtotalFromCart,
  updateCartItem,
} from "../../features/pos/posSlice";
import { formatCurrency } from "../../utils/formatters";

const EMPTY_OPTIONS = [];

export default function PosPage() {
  const dispatch = useDispatch();
  const { list: items } = useSelector((state) => state.items);
  const { list: customers } = useSelector((state) => state.customers);
  const { financialAccounts } = useSelector((state) => state.accounts);
  const accountOptions = Array.isArray(financialAccounts) ? financialAccounts : EMPTY_OPTIONS;
  const itemOptions = Array.isArray(items) ? items : EMPTY_OPTIONS;
  const customerOptions = Array.isArray(customers) ? customers : EMPTY_OPTIONS;
  const pos = useSelector((state) => state.pos);
  const isWalkInCustomer = !String(pos.customer_id || "").trim();

  useEffect(() => {
    dispatch(fetchItems());
    dispatch(fetchCustomers());
    dispatch(fetchFinancialAccounts());
  }, [dispatch]);

  /** Single cash/bank account: select by default so paid sales satisfy the API. */
  useEffect(() => {
    if (accountOptions.length === 1 && !pos.receipt_account_id) {
      dispatch(setPosField({ field: "receipt_account_id", value: String(accountOptions[0].id) }));
    }
  }, [accountOptions, pos.receipt_account_id, dispatch]);

  const { subtotal, discountPercent, discountAmount, total } = useMemo(() => {
    const sub = subtotalFromCart(pos.cartItems);
    let pct = Number(String(pos.discount_percent ?? "0").replace(/,/g, "."));
    if (!Number.isFinite(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    const disc = Math.round(sub * (pct / 100) * 100) / 100;
    const tot = Math.round((sub - disc) * 100) / 100;
    return { subtotal: sub, discountPercent: pct, discountAmount: disc, total: tot >= 0 ? tot : 0 };
  }, [pos.cartItems, pos.discount_percent]);

  useEffect(() => {
    const paid = Number(String(pos.paid_amount ?? "0").replace(/,/g, "."));
    if (!Number.isFinite(paid)) return;
    const roundedTotal = Math.max(0, Math.round(total * 100) / 100);
    const roundedPaid = Math.round(paid * 100) / 100;
    if (roundedTotal <= 0) {
      if (paid > 0) {
        dispatch(setPosField({ field: "paid_amount", value: "0.00" }));
      }
      return;
    }
    if (isWalkInCustomer && roundedPaid < roundedTotal) {
      dispatch(setPosField({ field: "paid_amount", value: roundedTotal.toFixed(2) }));
      return;
    }
    if (paid > roundedTotal + 1e-6) {
      dispatch(setPosField({ field: "paid_amount", value: roundedTotal.toFixed(2) }));
    }
  }, [total, pos.paid_amount, isWalkInCustomer, dispatch]);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [localBillError, setLocalBillError] = useState(null);

  const customerLabel =
    pos.customer_id && customerOptions.length
      ? customerOptions.find((c) => String(c.id) === String(pos.customer_id))?.full_name || "—"
      : "Walk-in customer";

  const receiptLabel =
    pos.receipt_account_id && accountOptions.length
      ? accountOptions.find((a) => String(a.id) === String(pos.receipt_account_id))?.account_name || "—"
      : "—";

  const paymentMethodLabel = {
    cash: "Cash",
    bank_transfer: "Bank transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
  }[pos.payment_method] || pos.payment_method;

  const lineRowTotal = (q, p) => Math.round(Number(q || 0) * Number(p || 0) * 100) / 100;
  const round2 = (n) => Math.round(n * 100) / 100;
  const paidNum = Number(String(pos.paid_amount ?? "0").replace(/,/g, ".")) || 0;
  const balanceDisplay = Math.max(0, round2(total - paidNum));
  const paidIsPositive = round2(paidNum) > 0;
  const hasReceiptAccount = Boolean(String(pos.receipt_account_id || "").trim());
  const receiptAccountRequired = paidIsPositive;
  const receiptAccountMissing = receiptAccountRequired && !hasReceiptAccount;

  const handleOpenBillModal = () => {
    if (!pos.cartItems.length) return;
    setLocalBillError(null);
    setBillModalOpen(true);
  };

  const handleSaveBill = async () => {
    if (receiptAccountMissing) {
      setLocalBillError("Select a receipt account when paid amount is greater than zero (see Current Bill).");
      return;
    }
    setLocalBillError(null);
    const result = await dispatch(submitSale());
    if (submitSale.fulfilled.match(result)) {
      setBillModalOpen(false);
      dispatch(fetchItems());
    }
  };

  const handleUpdateBill = () => {
    setLocalBillError(null);
    setBillModalOpen(false);
  };

  const handleCancelBill = () => {
    setLocalBillError(null);
    setBillModalOpen(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Point of Sale</h1>
          <p className="page-subtitle">Fast billing with Redux-driven cart and payment flow.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {itemOptions.map((item) => (
            <button
              key={item.id}
              className="card text-left hover:border hover:border-slate-900"
              onClick={() => dispatch(addToCart(item))}
            >
              <h3 className="font-semibold">{item.item_name}</h3>
              <p className="mt-1 text-sm text-slate-500">SKU: {item.sku}</p>
              <p className="mt-2 text-sm text-slate-600">Stock: {item.stock_quantity}</p>
              <p className="mt-3 text-lg font-bold">{formatCurrency(item.sale_price)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Current Bill</h2>

        <div>
          <label className="label">Customer</label>
          <select value={pos.customer_id} onChange={(e) => dispatch(setPosField({ field: "customer_id", value: e.target.value }))}>
            <option value="">Walk-in customer</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {pos.cartItems.map((row) => (
            <div key={row.item_id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.item_name}</p>
                  <p className="text-sm text-slate-500">Available: {row.available_stock}</p>
                </div>
                <button className="text-sm text-red-600" onClick={() => dispatch(removeFromCart(row.item_id))}>
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-2 grid-cols-2">
                <input
                  value={row.quantity}
                  onChange={(e) => dispatch(updateCartItem({ itemId: row.item_id, field: "quantity", value: e.target.value }))}
                />
                <input
                  value={row.unit_price}
                  onChange={(e) => dispatch(updateCartItem({ itemId: row.item_id, field: "unit_price", value: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <div>
            <label className="label">
              Receipt account
              {paidIsPositive ? <span className="text-red-600"> *</span> : null}
            </label>
            <select
              value={pos.receipt_account_id}
              onChange={(e) => {
                dispatch(setPosField({ field: "receipt_account_id", value: e.target.value }));
                if (localBillError) setLocalBillError(null);
              }}
              className={receiptAccountMissing && billModalOpen ? "ring-2 ring-amber-400" : ""}
            >
              <option value="">{accountOptions.length ? "Select account" : "No accounts available"}</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
            {paidIsPositive ? (
              <p className="mt-1 text-xs text-slate-500">Required when receiving payment. Choose where the money is deposited.</p>
            ) : null}
          </div>

          <div>
            <label className="label">Discount (% of subtotal)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={pos.discount_percent}
              onChange={(e) => dispatch(setPosField({ field: "discount_percent", value: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-500">Percentage off the line total. Total updates automatically.</p>
          </div>

          <div>
            <label className="label">Paid Amount</label>
            <input
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={pos.paid_amount}
              onChange={(e) => dispatch(setPosField({ field: "paid_amount", value: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Payment Method</label>
            <select value={pos.payment_method} onChange={(e) => dispatch(setPosField({ field: "payment_method", value: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-slate-900 p-4 text-sm text-white">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          {discountPercent > 0 ? (
            <div className="flex items-center justify-between text-slate-300">
              <span>Discount ({discountPercent}%)</span>
              <span>−{formatCurrency(discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-600 pt-2 text-base">
            <span>Total</span>
            <strong className="text-lg">{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="secondary-btn flex-1" onClick={() => dispatch(clearCart())}>
            Clear
          </button>
          <button
            className="primary-btn flex-1"
            type="button"
            onClick={handleOpenBillModal}
            disabled={!pos.cartItems.length || pos.submitting}
          >
            Checkout
          </button>
        </div>

        {pos.error ? <p className="text-sm text-red-600">{pos.error}</p> : null}
      </div>

      {billModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="absolute inset-0"
            role="presentation"
            aria-hidden
            onClick={handleCancelBill}
          />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-bill-modal-title"
          >
            <div className="border-b border-slate-200 pb-4 text-center">
              <h2 id="pos-bill-modal-title" className="text-lg font-semibold text-slate-900">
                Bill summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">Review before saving. Update returns you to the cart.</p>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Customer</span>
                <span className="font-medium text-slate-900">{customerLabel}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment method</span>
                <span className="font-medium text-slate-900">{paymentMethodLabel}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Receipt account</span>
                <span className="font-medium text-slate-900">{receiptLabel}</span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pos.cartItems.map((row) => {
                    const line = lineRowTotal(row.quantity, row.unit_price);
                    return (
                      <tr key={row.item_id}>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.item_name}</td>
                        <td className="px-3 py-2 text-slate-700">{row.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.unit_price)}</td>
                        <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(line)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountPercent > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid</span>
                <span className="font-medium text-slate-900">{formatCurrency(paidNum)}</span>
              </div>
              {balanceDisplay > 0.001 ? (
                <div className="flex justify-between text-amber-800">
                  <span>Balance</span>
                  <span className="font-medium">{formatCurrency(balanceDisplay)}</span>
                </div>
              ) : null}
            </div>

            {receiptAccountMissing ? (
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Select a <strong>receipt account</strong> under &quot;Current Bill&quot; (left) when paid amount is greater than zero, then save again.
              </p>
            ) : null}

            {localBillError ? <p className="mt-3 text-sm text-red-600">{localBillError}</p> : null}
            {pos.error ? <p className="mt-3 text-sm text-red-600">{pos.error}</p> : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" className="secondary-btn order-3 sm:order-1" onClick={handleCancelBill} disabled={pos.submitting}>
                Cancel bill
              </button>
              <button type="button" className="secondary-btn order-2" onClick={handleUpdateBill} disabled={pos.submitting}>
                Update bill
              </button>
              <button
                type="button"
                className="primary-btn order-1 sm:order-3"
                onClick={handleSaveBill}
                disabled={pos.submitting || receiptAccountMissing}
                title={receiptAccountMissing ? "Choose a receipt account first" : undefined}
              >
                {pos.submitting ? "Saving…" : "Save bill"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
