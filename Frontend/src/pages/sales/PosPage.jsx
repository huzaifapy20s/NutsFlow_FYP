import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgePercent,
  Banknote,
  CreditCard,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
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
const accentColor = "#ffcf83";

function PosMetric({ title, value, helper, icon: Icon, accent = false }) {
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

function StockBadge({ stock }) {
  const currentStock = Number(stock || 0);
  const outOfStock = currentStock <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        outOfStock
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${outOfStock ? "bg-rose-500" : "bg-emerald-500"}`}
      />
      {outOfStock ? "Out" : "In stock"}
    </span>
  );
}

function SummaryLine({ label, value, muted = false, strong = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${muted ? "text-slate-500" : "text-slate-700"}`}
    >
      <span>{label}</span>
      <span
        className={
          strong ? "font-bold text-slate-950" : "font-semibold text-slate-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function PosPage() {
  const dispatch = useDispatch();
  const { list: items } = useSelector((state) => state.items);
  const { list: customers } = useSelector((state) => state.customers);
  const { financialAccounts } = useSelector((state) => state.accounts);
  const accountOptions = Array.isArray(financialAccounts)
    ? financialAccounts
    : EMPTY_OPTIONS;
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
      dispatch(
        setPosField({
          field: "receipt_account_id",
          value: String(accountOptions[0].id),
        }),
      );
    }
  }, [accountOptions, pos.receipt_account_id, dispatch]);

  const { subtotal, discountPercent, discountAmount, total } = useMemo(() => {
    const sub = subtotalFromCart(pos.cartItems);
    let pct = Number(String(pos.discount_percent ?? "0").replace(/,/g, "."));
    if (!Number.isFinite(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    const disc = Math.round(sub * (pct / 100) * 100) / 100;
    const tot = Math.round((sub - disc) * 100) / 100;
    return {
      subtotal: sub,
      discountPercent: pct,
      discountAmount: disc,
      total: tot >= 0 ? tot : 0,
    };
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
      dispatch(
        setPosField({ field: "paid_amount", value: roundedTotal.toFixed(2) }),
      );
      return;
    }
    if (paid > roundedTotal + 1e-6) {
      dispatch(
        setPosField({ field: "paid_amount", value: roundedTotal.toFixed(2) }),
      );
    }
  }, [total, pos.paid_amount, isWalkInCustomer, dispatch]);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [localBillError, setLocalBillError] = useState(null);

  const customerLabel =
    pos.customer_id && customerOptions.length
      ? customerOptions.find((c) => String(c.id) === String(pos.customer_id))
          ?.full_name || "—"
      : "Walk-in customer";

  const receiptLabel =
    pos.receipt_account_id && accountOptions.length
      ? accountOptions.find(
          (a) => String(a.id) === String(pos.receipt_account_id),
        )?.account_name || "—"
      : "—";

  const paymentMethodLabel =
    {
      cash: "Cash",
      bank_transfer: "Bank transfer",
      card: "Card",
      cheque: "Cheque",
      other: "Other",
    }[pos.payment_method] || pos.payment_method;

  const lineRowTotal = (q, p) =>
    Math.round(Number(q || 0) * Number(p || 0) * 100) / 100;
  const round2 = (n) => Math.round(n * 100) / 100;
  const paidNum =
    Number(String(pos.paid_amount ?? "0").replace(/,/g, ".")) || 0;
  const balanceDisplay = Math.max(0, round2(total - paidNum));
  const paidIsPositive = round2(paidNum) > 0;
  const hasReceiptAccount = Boolean(
    String(pos.receipt_account_id || "").trim(),
  );
  const receiptAccountRequired = paidIsPositive;
  const receiptAccountMissing = receiptAccountRequired && !hasReceiptAccount;
  const cartQuantity = pos.cartItems.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );
  const inStockCount = itemOptions.filter(
    (item) => Number(item.stock_quantity || 0) > 0,
  ).length;

  const handleOpenBillModal = () => {
    if (!pos.cartItems.length) return;
    setLocalBillError(null);
    setBillModalOpen(true);
  };

  const handleSaveBill = async () => {
    if (receiptAccountMissing) {
      setLocalBillError(
        "Select a receipt account when paid amount is greater than zero (see Current Bill).",
      );
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
              Sales Counter
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Point of Sale
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Build a bill, select payment details, and save the sale from one
              clean ERP workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Current Customer
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <UserRound size={18} />
              </div>
              <p className="text-sm font-semibold text-white">
                {customerLabel}
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PosMetric
          title="Catalogue items"
          value={itemOptions.length}
          helper={`${inStockCount} available for sale`}
          icon={PackageCheck}
          accent
        />
        <PosMetric
          title="Cart lines"
          value={pos.cartItems.length}
          helper={`${cartQuantity.toFixed(2)} total units`}
          icon={ShoppingCart}
        />
        <PosMetric
          title="Bill total"
          value={formatCurrency(total)}
          helper="After discount"
          icon={ReceiptText}
        />
        <PosMetric
          title="Balance due"
          value={formatCurrency(balanceDisplay)}
          helper={
            paidIsPositive ? "Based on paid amount" : "No payment received yet"
          }
          icon={WalletCards}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Item Catalogue
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select products to add them to the current bill.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              {itemOptions.length} items
            </div>
          </div>

          {itemOptions.length ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 2xl:grid-cols-3">
              {itemOptions.map((item) => (
                <button
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffcf83] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#ffcf83]/70"
                  onClick={() => dispatch(addToCart(item))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {item.item_name}
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        SKU: {item.sku || "—"}
                      </p>
                    </div>
                    <StockBadge stock={item.stock_quantity} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stock
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-950">
                        {item.stock_quantity ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Sale price
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-950">
                        {formatCurrency(item.sale_price)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>{item.category || "Uncategorized"}</span>
                    <span className="text-slate-950 transition group-hover:text-amber-700">
                      Add to bill
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                <PackageCheck size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-950">
                No items available
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Add inventory items first, then they will appear in the POS
                catalogue.
              </p>
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Current Bill</h2>
              <p className="mt-1 text-sm text-slate-500">
                Customer, cart and payment details.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
              <ReceiptText size={20} />
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="label">Customer</label>
              <select
                value={pos.customer_id}
                onChange={(e) =>
                  dispatch(
                    setPosField({
                      field: "customer_id",
                      value: e.target.value,
                    }),
                  )
                }
              >
                <option value="">Walk-in customer</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-950">Cart Items</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {pos.cartItems.length} lines
                </span>
              </div>

              {pos.cartItems.length ? (
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {pos.cartItems.map((row) => (
                    <div
                      key={row.item_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {row.item_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Available: {row.available_stock}
                          </p>
                        </div>
                        <button
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                          type="button"
                          onClick={() => dispatch(removeFromCart(row.item_id))}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Qty
                          </label>
                          <input
                            value={row.quantity}
                            onChange={(e) =>
                              dispatch(
                                updateCartItem({
                                  itemId: row.item_id,
                                  field: "quantity",
                                  value: e.target.value,
                                }),
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Unit price
                          </label>
                          <input
                            value={row.unit_price}
                            onChange={(e) =>
                              dispatch(
                                updateCartItem({
                                  itemId: row.item_id,
                                  field: "unit_price",
                                  value: e.target.value,
                                }),
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                        <span className="font-medium text-slate-500">
                          Line total
                        </span>
                        <span className="font-bold text-slate-950">
                          {formatCurrency(
                            lineRowTotal(row.quantity, row.unit_price),
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <ShoppingCart className="mx-auto text-slate-400" size={24} />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Cart is empty
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select an item from the catalogue to start billing.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <div>
                <label className="label">
                  Receipt account
                  {paidIsPositive ? (
                    <span className="text-red-600"> *</span>
                  ) : null}
                </label>
                <select
                  value={pos.receipt_account_id}
                  onChange={(e) => {
                    dispatch(
                      setPosField({
                        field: "receipt_account_id",
                        value: e.target.value,
                      }),
                    );
                    if (localBillError) setLocalBillError(null);
                  }}
                  className={
                    receiptAccountMissing && billModalOpen
                      ? "ring-2 ring-amber-400"
                      : ""
                  }
                >
                  <option value="">
                    {accountOptions.length
                      ? "Select account"
                      : "No accounts available"}
                  </option>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
                {paidIsPositive ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Required when receiving payment. Choose where the money is
                    deposited.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <label className="label">Discount (% of subtotal)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={pos.discount_percent}
                    onChange={(e) =>
                      dispatch(
                        setPosField({
                          field: "discount_percent",
                          value: e.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div>
                  <label className="label">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={pos.paid_amount}
                    onChange={(e) =>
                      dispatch(
                        setPosField({
                          field: "paid_amount",
                          value: e.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  value={pos.payment_method}
                  onChange={(e) =>
                    dispatch(
                      setPosField({
                        field: "payment_method",
                        value: e.target.value,
                      }),
                    )
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div
                className="h-1 w-full"
                style={{ backgroundColor: accentColor }}
              />
              <div className="p-4 text-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                    <ReceiptText size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Bill Summary
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Live checkout totals
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <span>Subtotal</span>
                    <strong className="text-slate-950">
                      {formatCurrency(subtotal)}
                    </strong>
                  </div>
                  {discountPercent > 0 ? (
                    <div className="flex items-center justify-between gap-4 text-slate-500">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-950">Total</span>
                    <strong className="text-lg text-slate-950">
                      {formatCurrency(total)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-slate-500">
                    <span>Paid</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(paidNum)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-slate-500">
                    <span>Balance</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(balanceDisplay)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="secondary-btn flex-1"
                onClick={() => dispatch(clearCart())}
              >
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

            {pos.error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {pos.error}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {billModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            role="presentation"
            aria-hidden
            onClick={handleCancelBill}
          />
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-bill-modal-title"
          >
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: accentColor }}
            />

            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Checkout Review
                </p>
                <h2
                  id="pos-bill-modal-title"
                  className="mt-1 text-xl font-bold text-slate-950"
                >
                  Bill Summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review bill details before saving the sale.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
                onClick={handleCancelBill}
                disabled={pos.submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Customer
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">
                    {customerLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Payment Method
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {paymentMethodLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Receipt Account
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">
                    {receiptLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Sale Items
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {pos.cartItems.length} lines, {cartQuantity.toFixed(2)}{" "}
                        units
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                      <ReceiptText size={16} />
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">#</th>
                          <th className="px-4 py-3 font-semibold">Item</th>
                          <th className="px-4 py-3 text-center font-semibold">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Line Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pos.cartItems.map((row, index) => {
                          const line = lineRowTotal(
                            row.quantity,
                            row.unit_price,
                          );

                          return (
                            <tr key={row.item_id} className="bg-white">
                              <td className="px-4 py-3 text-slate-500">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-950">
                                  {row.item_name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Available stock: {row.available_stock}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700">
                                {row.quantity}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700">
                                {formatCurrency(row.unit_price)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-950">
                                {formatCurrency(line)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="p-4 text-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                          <BadgePercent size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Payment Summary
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Final totals before saving.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <SummaryLine
                          label="Subtotal"
                          value={formatCurrency(subtotal)}
                        />
                        {discountPercent > 0 ? (
                          <SummaryLine
                            label={`Discount (${discountPercent}%)`}
                            value={`-${formatCurrency(discountAmount)}`}
                            muted
                          />
                        ) : null}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Total Bill
                          </p>
                          <p className="mt-1 text-2xl font-bold text-slate-950">
                            {formatCurrency(total)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Paid
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatCurrency(paidNum)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Balance
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatCurrency(balanceDisplay)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {receiptAccountMissing ? (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      Select a <strong>receipt account</strong> in Current Bill
                      before saving because paid amount is greater than zero.
                    </p>
                  ) : null}

                  {localBillError ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {localBillError}
                    </p>
                  ) : null}
                  {pos.error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {pos.error}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className="secondary-btn order-3 sm:order-1"
                onClick={handleCancelBill}
                disabled={pos.submitting}
              >
                Cancel bill
              </button>
              <button
                type="button"
                className="secondary-btn order-2"
                onClick={handleUpdateBill}
                disabled={pos.submitting}
              >
                Update bill
              </button>
              <button
                type="button"
                className="primary-btn order-1 sm:order-3"
                onClick={handleSaveBill}
                disabled={pos.submitting || receiptAccountMissing}
                title={
                  receiptAccountMissing
                    ? "Choose a receipt account first"
                    : undefined
                }
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
