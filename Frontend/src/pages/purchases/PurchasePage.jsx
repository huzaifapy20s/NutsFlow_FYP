import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosClient from "../../api/axiosClient";
import {
  AlertCircle,
  BadgeDollarSign,
  Boxes,
  Building2,
  ChevronDown,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
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
import { formatCurrency, formatDate } from "../../utils/formatters";

const accentColor = "#ffcf83";

function PurchaseMetric({ title, value, helper, icon: Icon, accent = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {helper ? <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p> : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            accent ? "border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950" : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, value, wide = false }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function PurchaseStatus({ due }) {
  const balanceDue = Number(due || 0);
  const isDue = balanceDue > 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        isDue ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isDue ? "bg-amber-500" : "bg-emerald-500"}`} />
      {isDue ? "Due" : "Paid"}
    </span>
  );
}

export default function PurchasePage() {
  const dispatch = useDispatch();
  const { draft, list, submitting, error, deletedPurchase } = useSelector((state) => state.purchases);
  const { list: suppliers } = useSelector((state) => state.suppliers);
  const { list: items } = useSelector((state) => state.items);
  const { financialAccounts } = useSelector((state) => state.accounts);
  const accountOptions = Array.isArray(financialAccounts) ? financialAccounts : [];
  const supplierOptions = Array.isArray(suppliers) ? suppliers : [];
  const itemOptions = Array.isArray(items) ? items : [];
  const purchases = Array.isArray(list) ? list : [];
  const purchaseLines = Array.isArray(draft.purchase_items) ? draft.purchase_items : [];
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [activeActionPurchase, setActiveActionPurchase] = useState(null);
  const [loadingPurchaseId, setLoadingPurchaseId] = useState(null);
  const [viewError, setViewError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const undoTimerRef = useRef(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPurchases = useMemo(() => {
    if (!normalizedSearch) return purchases;

    return purchases.filter((purchase) => {
      const formattedDate = formatDate(purchase.purchase_date);
      const searchableText = [
        purchase.id,
        purchase.invoice_number,
        purchase.supplier_name,
        purchase.purchase_date,
        formattedDate,
        purchase.total_amount,
        purchase.paid_amount,
        purchase.balance_due,
        purchase.payment_status,
        Number(purchase.balance_due || 0) > 0 ? "due" : "paid clear",
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [purchases, normalizedSearch]);
  const filteredPurchaseDue = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.balance_due || 0),
    0,
  );

  const purchaseStats = useMemo(() => {
    const totalAmount = purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount || 0), 0);
    const totalDue = purchases.reduce((sum, purchase) => sum + Number(purchase.balance_due || 0), 0);
    const purchasesWithDue = purchases.filter((purchase) => Number(purchase.balance_due || 0) > 0).length;
    const paidAmount = totalAmount - totalDue;

    return {
      totalPurchases: purchases.length,
      totalAmount,
      totalDue,
      paidAmount,
      purchasesWithDue,
    };
  }, [purchases]);

  const draftSubtotal = purchaseLines.reduce((sum, row) => {
    const quantity = parseFloat(row.quantity) || 0;
    const unitCost = parseFloat(row.unit_cost) || 0;
    return sum + quantity * unitCost;
  }, 0);
  const draftPaidAmount = parseFloat(draft.paid_amount) || 0;
  const draftBalanceDue = Math.max(draftSubtotal - draftPaidAmount, 0);

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

  const handleOpenCreateModal = () => {
    dispatch(resetPurchaseDraft());
    setEditingId(null);
    setSelectedPurchase(null);
    setViewError(null);
    setActiveActionPurchase(null);
    clearUndo();
    setIsPurchaseModalOpen(true);
  };

  const handleClosePurchaseModal = () => {
    dispatch(resetPurchaseDraft());
    setEditingId(null);
    setActiveActionPurchase(null);
    setIsPurchaseModalOpen(false);
  };

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
      setIsPurchaseModalOpen(false);
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
      clearUndo();
      setIsPurchaseModalOpen(true);
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
    setIsPurchaseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              Purchase Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Purchases</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create supplier purchases and update stock with average cost while keeping payable balances easy to review.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              onClick={handleOpenCreateModal}
            >
              <Plus size={17} className="text-[#ffcf83]" />
              Create Purchase
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Supplier Due Balance</p>
              <p className="mt-2 text-2xl font-bold text-[#ffcf83]">{formatCurrency(purchaseStats.totalDue)}</p>
              <p className="mt-1 text-sm text-slate-400">Outstanding amount from purchase records</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PurchaseMetric title="Total Purchases" value={purchaseStats.totalPurchases} helper="Recorded purchase bills" icon={Truck} accent />
        <PurchaseMetric title="Purchase Value" value={formatCurrency(purchaseStats.totalAmount)} helper="Total supplier purchases" icon={BadgeDollarSign} />
        <PurchaseMetric title="Paid Amount" value={formatCurrency(purchaseStats.paidAmount)} helper="Estimated paid from records" icon={Building2} accent />
        <PurchaseMetric title="Bills With Due" value={purchaseStats.purchasesWithDue} helper="Purchases with balance due" icon={AlertCircle} />
      </section>

      {deletedPurchase ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <RotateCcw size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Purchase deleted</p>
                <p className="text-sm text-slate-600">You can undo this action within 5 seconds.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="secondary-btn" onClick={handleUndo}>
                Undo
              </button>
              <button type="button" className="secondary-btn" onClick={clearUndo}>
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {viewError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {viewError}
        </section>
      ) : null}

      {!isPurchaseModalOpen && error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Purchase Register</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Purchase Directory</h2>
              <p className="mt-1 text-sm text-slate-500">Clean purchase list with invoice, supplier, date, total amount, and due balance.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setActiveActionPurchase(null);
                  }}
                  placeholder="Search invoice, supplier, date..."
                  className="no-native-search-clear h-10 rounded-lg border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-medium"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveActionPurchase(null);
                    }}
                    aria-label="Clear purchase search"
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                {filteredPurchases.length}
                {normalizedSearch ? ` of ${purchaseStats.totalPurchases}` : ""} records
              </div>
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <BadgeDollarSign size={15} className="text-slate-500" />
                {formatCurrency(filteredPurchaseDue)} due
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={handleOpenCreateModal}
              >
                <Plus size={15} className="text-[#ffcf83]" />
                Add Purchase
              </button>
            </div>
          </div>
        </div>

        {filteredPurchases.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="w-[82px] px-5 py-3 font-semibold">No.</th>
                  <th className="w-[130px] px-5 py-3 font-semibold">Purchase ID</th>
                  <th className="min-w-[180px] px-5 py-3 font-semibold">Invoice</th>
                  <th className="min-w-[240px] px-5 py-3 font-semibold">Supplier</th>
                  <th className="min-w-[140px] px-5 py-3 font-semibold">Date</th>
                  <th className="min-w-[150px] px-5 py-3 text-right font-semibold">Total</th>
                  <th className="min-w-[160px] px-5 py-3 text-right font-semibold">Due Balance</th>
                  <th className="w-[130px] px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPurchases.map((purchase, index) => {
                  const hasDue = Number(purchase.balance_due || 0) > 0;
                  const isLoading = loadingPurchaseId === purchase.id;

                  return (
                    <tr key={purchase.id || index} className="group transition hover:bg-[#ffcf83]/[0.08]">
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold tabular-nums text-slate-600 group-hover:border-[#ffcf83]/70 group-hover:bg-white">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 shadow-sm">
                          {purchase.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <button
                          type="button"
                          className="font-semibold text-slate-950 transition hover:text-slate-700"
                          onClick={() => handleView(purchase.id)}
                        >
                          {purchase.invoice_number || `INV-${purchase.id}`}
                        </button>
                        <div className="mt-1 flex items-center gap-2">
                          <PurchaseStatus due={purchase.balance_due} />
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="min-w-[220px]">
                          <p className="font-semibold text-slate-900">{purchase.supplier_name || "-"}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Supplier purchase record</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-700">
                          {formatDate(purchase.purchase_date)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <span className="font-semibold tabular-nums text-slate-950">{formatCurrency(purchase.total_amount)}</span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div
                          className={`ml-auto inline-flex min-w-[130px] flex-col rounded-xl border px-3 py-2 text-right ${
                            hasDue
                              ? "border-[#ffcf83]/70 bg-[#ffcf83]/20 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="font-semibold tabular-nums">{formatCurrency(purchase.balance_due)}</span>
                          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {hasDue ? "Due" : "Clear"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => setActiveActionPurchase(activeActionPurchase === purchase.id ? null : purchase.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? "Loading" : "Actions"}
                            <ChevronDown size={15} />
                          </button>

                          {activeActionPurchase === purchase.id ? (
                            <div className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                                <span className="text-sm font-semibold text-slate-700">Quick actions</span>
                                <button
                                  type="button"
                                  className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                                  onClick={() => setActiveActionPurchase(null)}
                                  aria-label="Close actions"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                              <div className="flex flex-col gap-1 p-2">
                                <button
                                  type="button"
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => {
                                    handleView(purchase.id);
                                    setActiveActionPurchase(null);
                                  }}
                                >
                                  <Eye size={16} />
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => {
                                    handleEdit(purchase.id);
                                    setActiveActionPurchase(null);
                                  }}
                                >
                                  <Pencil size={16} />
                                  Update
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                  onClick={() => {
                                    handleDelete(purchase);
                                    setActiveActionPurchase(null);
                                  }}
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
              <Boxes size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-950">
              {purchases.length ? "No matching purchases found" : "No purchases found"}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {purchases.length
                ? "Try another invoice number, supplier, date, amount, or payment status."
                : "Create your first supplier purchase from the add purchase modal to start updating stock and payable records."}
            </p>
            {purchases.length ? (
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => {
                  setSearchTerm("");
                  setActiveActionPurchase(null);
                }}
              >
                <X size={16} />
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={handleOpenCreateModal}
              >
                <Plus size={16} className="text-[#ffcf83]" />
                Add Purchase
              </button>
            )}
          </div>
        )}
      </section>

      {isPurchaseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {editingId ? "Update Purchase" : "New Purchase"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {editingId ? `Edit purchase #${editingId}` : "Create Purchase"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Enter supplier, invoice, payment account, paid amount, notes, and purchase lines.</p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={handleClosePurchaseModal}
                aria-label="Close purchase form"
              >
                <X size={20} />
              </button>
            </div>

            <form className="max-h-[calc(92vh-96px)] space-y-5 overflow-y-auto p-6" onSubmit={handleSubmit}>
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  placeholder="Add notes for this purchase"
                />
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Purchase Lines</p>
                    <h4 className="mt-1 font-semibold text-slate-950">Items in this purchase</h4>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    onClick={() => dispatch(addPurchaseLine())}
                  >
                    <Plus size={15} className="text-[#ffcf83]" />
                    Add Line
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  {purchaseLines.map((row, index) => {
                    const quantity = parseFloat(row.quantity) || 0;
                    const unitCost = parseFloat(row.unit_cost) || 0;
                    const lineTotal = quantity * unitCost;

                    return (
                      <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]">
                        <div>
                          <label className="label">Item</label>
                          <select value={row.item_id} onChange={(e) => dispatch(updatePurchaseLine({ index, field: "item_id", value: e.target.value }))}>
                            <option value="">Select item</option>
                            {itemOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.item_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="label">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.quantity}
                            onChange={(e) => dispatch(updatePurchaseLine({ index, field: "quantity", value: e.target.value }))}
                            placeholder="Quantity"
                          />
                        </div>

                        <div>
                          <label className="label">Unit Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.unit_cost}
                            onChange={(e) => dispatch(updatePurchaseLine({ index, field: "unit_cost", value: e.target.value }))}
                            placeholder="Unit Cost"
                          />
                        </div>

                        <div>
                          <label className="label">Line Total</label>
                          <div className="flex min-h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-950">
                            {formatCurrency(lineTotal.toFixed(2))}
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                            onClick={() => dispatch(removePurchaseLine(index))}
                          >
                            <Trash2 size={15} />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailBlock label="Draft Subtotal" value={formatCurrency(draftSubtotal)} />
                  <DetailBlock label="Paid Amount" value={formatCurrency(draftPaidAmount)} />
                  <DetailBlock label="Estimated Due" value={formatCurrency(draftBalanceDue)} />
                </div>
              </div>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" className="secondary-btn" onClick={editingId ? handleCancelEdit : handleClosePurchaseModal}>
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={submitting}
                >
                  <Save size={16} className="text-[#ffcf83]" />
                  {submitting ? "Saving..." : editingId ? "Update Purchase" : "Submit Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedPurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Purchase Details</p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  Invoice {selectedPurchase.invoice_number || `#${selectedPurchase.id}`}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPurchase.supplier?.supplier_name || selectedPurchase.supplier_name || "Supplier"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => setSelectedPurchase(null)}
                aria-label="Close purchase details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailBlock label="Purchase ID" value={selectedPurchase.id || "-"} />
                <DetailBlock label="Purchase Date" value={formatDate(selectedPurchase.purchase_date)} />
                <DetailBlock label="Payment Status" value={selectedPurchase.payment_status || "-"} />
                <DetailBlock label="Paid Amount" value={formatCurrency(selectedPurchase.paid_amount)} />
                <DetailBlock label="Balance Due" value={formatCurrency(selectedPurchase.balance_due)} />
                <DetailBlock label="Subtotal" value={formatCurrency(selectedPurchase.subtotal)} />
                <DetailBlock label="Discount" value={formatCurrency(selectedPurchase.discount_amount)} />
                <DetailBlock label="Tax" value={formatCurrency(selectedPurchase.tax_amount)} />
                <DetailBlock label="Total" value={formatCurrency(selectedPurchase.total_amount)} />
                <DetailBlock label="Payment Method" value={selectedPurchase.payment_method || "-"} />
                <DetailBlock label="Payment Account" value={selectedPurchase.payment_account_name || selectedPurchase.payment_account?.account_name || "-"} />
                <DetailBlock label="Notes" value={selectedPurchase.notes || "No notes added"} wide />
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="font-semibold text-slate-950">Purchase Items</h4>
                  <p className="mt-1 text-sm text-slate-500">Complete item lines included in this purchase bill.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                        <th className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                        <th className="px-4 py-3 text-right font-semibold">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedPurchase.purchase_items || []).map((line, index) => (
                        <tr key={line.id || index} className="hover:bg-[#ffcf83]/[0.08]">
                          <td className="px-4 py-3 font-semibold text-slate-900">{line.item_name || line.item?.item_name || "-"}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">{line.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrency(line.unit_cost)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-950">{formatCurrency(line.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
