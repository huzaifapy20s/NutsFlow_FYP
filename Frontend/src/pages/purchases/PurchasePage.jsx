import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import axiosClient from "../../api/axiosClient";
import {
  addPurchaseLine,
  clearDeletedPurchase,
  deletePurchase,
  fetchPurchases,
  removePurchaseLine,
  resetPurchaseDraft,
  restorePurchase,
  setPurchaseDraft,
  setPurchaseField,
  submitPurchase,
  updatePurchase,
  updatePurchaseLine,
} from "../../features/purchases/purchasesSlice";
import { fetchSuppliers } from "../../features/suppliers/suppliersSlice";
import { fetchItems } from "../../features/items/itemsSlice";
import { fetchFinancialAccounts, fetchSupplierAccounts } from "../../features/accounts/accountsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function PurchasePage() {
  const dispatch = useDispatch();
  const { draft, list, submitting, error, deletedPurchase } = useSelector((state) => state.purchases);
  const { list: suppliers } = useSelector((state) => state.suppliers);
  const { list: items } = useSelector((state) => state.items);
  const { financialAccounts } = useSelector((state) => state.accounts);
  const accountOptions = Array.isArray(financialAccounts) ? financialAccounts : [];
  const supplierOptions = Array.isArray(suppliers) ? suppliers : [];
  const itemOptions = Array.isArray(items) ? items : [];
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [activeActionPurchase, setActiveActionPurchase] = useState(null);
  const [loadingPurchaseId, setLoadingPurchaseId] = useState(null);
  const [viewError, setViewError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const undoTimerRef = useRef(null);

  const clearUndo = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    dispatch(clearDeletedPurchase());
  };

  useEffect(() => {
    dispatch(fetchPurchases());
    dispatch(fetchSuppliers());
    dispatch(fetchItems());
    dispatch(fetchFinancialAccounts());
    return () => {
      clearUndo();
    };
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const resultAction = editingId
      ? await dispatch(updatePurchase({ purchaseId: editingId, payload: draft }))
      : await dispatch(submitPurchase());

    if (editingId ? updatePurchase.fulfilled.match(resultAction) : submitPurchase.fulfilled.match(resultAction)) {
      await dispatch(fetchPurchases());
      await dispatch(fetchSuppliers());
      dispatch(fetchItems());
      dispatch(fetchFinancialAccounts());
      setEditingId(null);
    }
  };

  const handleView = async (purchaseId) => {
    setSelectedPurchase(null);
    setViewError(null);
    setLoadingPurchaseId(purchaseId);
    setActiveActionPurchase(null);

    try {
      const response = await axiosClient.get(`/api/purchases/${purchaseId}`);
      setSelectedPurchase(response.data.data);
    } catch (error) {
      setViewError(error.response?.data?.message || "Unable to load purchase details.");
    } finally {
      setLoadingPurchaseId(null);
    }
  };

  const handleEdit = async (purchaseId) => {
    setSelectedPurchase(null);
    setViewError(null);
    setLoadingPurchaseId(purchaseId);
    setActiveActionPurchase(null);

    try {
      const response = await axiosClient.get(`/api/purchases/${purchaseId}`);
      const purchase = response.data.data;
      dispatch(setPurchaseDraft({
        ...purchase,
        supplier_id: purchase.supplier?.id || "",
        payment_account_id: purchase.payment_account_id || "",
      }));
      setEditingId(purchaseId);
    } catch (error) {
      setViewError(error.response?.data?.message || "Unable to load purchase for editing.");
    } finally {
      setLoadingPurchaseId(null);
    }
  };

  const handleDelete = async (purchase) => {
    const confirmed = window.confirm(
      `Delete purchase ${purchase.invoice_number || `#${purchase.id}`} from ${purchase.supplier_name || "supplier"}? This action can be undone for 5 seconds.`
    );
    if (!confirmed) {
      return;
    }

    try {
      // Fetch complete purchase details before deletion for proper restoration
      const response = await axiosClient.get(`/api/purchases/${purchase.id}`);
      const fullPurchase = response.data.data;

      const resultAction = await dispatch(deletePurchase({
        purchaseId: purchase.id,
        purchaseData: {
          supplier_id: fullPurchase.supplier?.id || fullPurchase.supplier_id,
          payment_account_id: fullPurchase.payment_account_id,
          invoice_number: fullPurchase.invoice_number,
          discount_amount: fullPurchase.discount_amount,
          paid_amount: fullPurchase.paid_amount,
          payment_method: fullPurchase.payment_method,
          notes: fullPurchase.notes,
          tax_amount: fullPurchase.tax_amount,
          purchase_items: fullPurchase.purchase_items || [],
        }
      }));

      if (deletePurchase.fulfilled.match(resultAction)) {
        await dispatch(fetchPurchases());
        await dispatch(fetchSuppliers());
        await dispatch(fetchSupplierAccounts());
        dispatch(fetchItems());
        setActiveActionPurchase(null);
        if (selectedPurchase?.id === purchase.id) {
          setSelectedPurchase(null);
        }
        undoTimerRef.current = setTimeout(() => {
          clearUndo();
        }, 5000);
      }
    } catch (error) {
      setViewError(error.response?.data?.message || "Unable to delete purchase.");
    }
  };

  const handleUndo = async () => {
    if (!deletedPurchase) {
      return;
    }

    try {
      const resultAction = await dispatch(restorePurchase(deletedPurchase));

      if (restorePurchase.fulfilled.match(resultAction)) {
        await dispatch(fetchPurchases());
        await dispatch(fetchSuppliers());
        await dispatch(fetchSupplierAccounts());
        dispatch(fetchItems());
        clearUndo();
      } else {
        setViewError(resultAction.payload || "Failed to restore purchase.");
      }
    } catch (error) {
      setViewError("Error restoring purchase. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    dispatch(resetPurchaseDraft());
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Purchases</h1>
        <p className="page-subtitle">Create supplier purchases and update stock with average cost.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form className="card space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Supplier</label>
              <select value={draft.supplier_id} onChange={(e) => dispatch(setPurchaseField({ field: "supplier_id", value: e.target.value }))}>
                <option value="">Select supplier</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Invoice Number</label>
              <input value={draft.invoice_number} onChange={(e) => dispatch(setPurchaseField({ field: "invoice_number", value: e.target.value }))} />
            </div>

            <div>
              <label className="label">Payment Account</label>
              <select value={draft.payment_account_id} onChange={(e) => dispatch(setPurchaseField({ field: "payment_account_id", value: e.target.value }))}>
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
              <input value={draft.paid_amount} onChange={(e) => dispatch(setPurchaseField({ field: "paid_amount", value: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => dispatch(setPurchaseField({ field: "notes", value: e.target.value }))}
              rows={4}
              className="w-full p-2 border rounded"
              placeholder="Add notes for this purchase"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Purchase Lines</h3>
              <button type="button" className="secondary-btn" onClick={() => dispatch(addPurchaseLine())}>
                Add Line
              </button>
            </div>

            {draft.purchase_items.map((row, index) => {
              const quantity = parseFloat(row.quantity) || 0;
              const unitCost = parseFloat(row.unit_cost) || 0;
              const lineTotal = quantity * unitCost;

              return (
                <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5">
                  <select value={row.item_id} onChange={(e) => dispatch(updatePurchaseLine({ index, field: "item_id", value: e.target.value }))}>
                    <option value="">Select item</option>
                    {itemOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    value={row.quantity}
                    onChange={(e) => dispatch(updatePurchaseLine({ index, field: "quantity", value: e.target.value }))}
                    placeholder="Quantity"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={row.unit_cost}
                    onChange={(e) => dispatch(updatePurchaseLine({ index, field: "unit_cost", value: e.target.value }))}
                    placeholder="Unit Cost"
                  />
                  <div className="flex items-center px-3 py-2 bg-slate-50 rounded border">
                    <span className="text-sm font-medium">{formatCurrency(lineTotal.toFixed(2))}</span>
                  </div>
                  <button type="button" className="danger-btn" onClick={() => dispatch(removePurchaseLine(index))}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId ? "Update Purchase" : "Submit Purchase"}
          </button>

          {editingId ? (
            <button type="button" className="secondary-btn" onClick={handleCancelEdit}>
              Cancel Edit
            </button>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div>
          {viewError ? <p className="text-sm text-red-600 mb-4">{viewError}</p> : null}
          {deletedPurchase ? (
            <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">Purchase deleted. Undo within 5 seconds.</p>
              <div className="flex gap-2">
                <button type="button" className="secondary-btn" onClick={handleUndo}>
                  Undo
                </button>
                <button type="button" className="secondary-btn" onClick={clearUndo}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
          <DataTable
            columns={[
              { key: "invoice_number", title: "Invoice" },
              { key: "supplier_name", title: "Supplier" },
              { key: "purchase_date", title: "Date" },
              { key: "total_amount", title: "Total", render: (row) => formatCurrency(row.total_amount) },
              { key: "balance_due", title: "Due Balance ", render: (row) => formatCurrency(row.balance_due) },
              {
                key: "actions",
                title: "Actions",
                render: (row) => (
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      className="secondary-btn py-1 px-3"
                      onClick={() => setActiveActionPurchase(activeActionPurchase === row.id ? null : row.id)}
                    >
                      Actions
                    </button>
                    {activeActionPurchase === row.id ? (
                      <div className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 bg-slate-50">
                          <span className="text-sm font-medium text-slate-700">Choose action</span>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => setActiveActionPurchase(null)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex flex-col gap-1 p-2">
                          <button
                            type="button"
                            className="text-left rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                            onClick={() => {
                              handleView(row.id);
                              setActiveActionPurchase(null);
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="text-left rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                            onClick={() => {
                              handleEdit(row.id);
                              setActiveActionPurchase(null);
                            }}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="text-left rounded-md px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                            onClick={() => {
                              handleDelete(row);
                              setActiveActionPurchase(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={list}
          />
        </div>
      </div>

      {selectedPurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Purchase Details</h3>
                <p className="text-sm text-slate-600">
                  Invoice {selectedPurchase.invoice_number || `#${selectedPurchase.id}`} — {selectedPurchase.supplier?.supplier_name}
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={() => setSelectedPurchase(null)}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-semibold">Purchase Date</p>
                <p>{selectedPurchase.purchase_date}</p>
              </div>
              <div>
                <p className="font-semibold">Payment Status</p>
                <p>{selectedPurchase.payment_status}</p>
              </div>
              <div>
                <p className="font-semibold">Paid Amount</p>
                <p>{formatCurrency(selectedPurchase.paid_amount)}</p>
              </div>
              <div>
                <p className="font-semibold">Balance Due</p>
                <p>{formatCurrency(selectedPurchase.balance_due)}</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold">Purchase Items</h4>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Quantity</th>
                      <th className="px-3 py-2 font-medium">Unit Cost</th>
                      <th className="px-3 py-2 font-medium">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.purchase_items.map((line) => (
                      <tr key={line.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{line.item_name}</td>
                        <td className="px-3 py-2">{line.quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(line.unit_cost)}</td>
                        <td className="px-3 py-2">{formatCurrency(line.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-semibold">Subtotal</p>
                <p>{formatCurrency(selectedPurchase.subtotal)}</p>
              </div>
              <div>
                <p className="font-semibold">Discount</p>
                <p>{formatCurrency(selectedPurchase.discount_amount)}</p>
              </div>
              <div>
                <p className="font-semibold">Tax</p>
                <p>{formatCurrency(selectedPurchase.tax_amount)}</p>
              </div>
              <div>
                <p className="font-semibold">Total</p>
                <p>{formatCurrency(selectedPurchase.total_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}