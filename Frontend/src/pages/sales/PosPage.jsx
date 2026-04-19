import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchItems } from "../../features/items/itemsSlice";
import { fetchCustomers } from "../../features/customers/customersSlice";
import { fetchFinancialAccounts } from "../../features/accounts/accountsSlice";
import { addToCart, clearCart, removeFromCart, setPosField, submitSale, updateCartItem } from "../../features/pos/posSlice";
import { formatCurrency } from "../../utils/formatters";

export default function PosPage() {
  const dispatch = useDispatch();
  const { list: items } = useSelector((state) => state.items);
  const { list: customers } = useSelector((state) => state.customers);
  const { financialAccounts } = useSelector((state) => state.accounts);
  const accountOptions = Array.isArray(financialAccounts) ? financialAccounts : [];
  const itemOptions = Array.isArray(items) ? items : [];
  const customerOptions = Array.isArray(customers) ? customers : [];
  const pos = useSelector((state) => state.pos);

  useEffect(() => {
    dispatch(fetchItems());
    dispatch(fetchCustomers());
    dispatch(fetchFinancialAccounts());
  }, [dispatch]);

  const subtotal = useMemo(
    () =>
      pos.cartItems.reduce(
        (sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_price || 0),
        0
      ),
    [pos.cartItems]
  );

  const handleCheckout = async () => {
    await dispatch(submitSale());
    dispatch(fetchItems());
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
            <label className="label">Receipt Account</label>
            <select value={pos.receipt_account_id} onChange={(e) => dispatch(setPosField({ field: "receipt_account_id", value: e.target.value }))}>
              <option value="">Select account</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Paid Amount</label>
            <input value={pos.paid_amount} onChange={(e) => dispatch(setPosField({ field: "paid_amount", value: e.target.value }))} />
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

        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="secondary-btn flex-1" onClick={() => dispatch(clearCart())}>
            Clear
          </button>
          <button className="primary-btn flex-1" onClick={handleCheckout} disabled={!pos.cartItems.length || pos.submitting}>
            {pos.submitting ? "Processing..." : "Checkout"}
          </button>
        </div>

        {pos.error ? <p className="text-sm text-red-600">{pos.error}</p> : null}
      </div>
    </div>
  );
}