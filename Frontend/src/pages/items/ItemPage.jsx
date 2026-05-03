import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Eye,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Tags,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import {
  createItem,
  deleteItem,
  editItem,
  fetchItems,
  resetItemDraft,
  restoreItem,
  setItemDraftField,
  updateItem,
} from "../../features/items/itemsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function InventoryMetric({ title, value, helper, icon: Icon, accent = false }) {
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

function StockStatus({ stock, threshold }) {
  const currentStock = Number(stock || 0);
  const lowStockLimit = Number(threshold || 0);
  const isLow = lowStockLimit > 0 && currentStock <= lowStockLimit;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        isLow ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isLow ? "bg-amber-500" : "bg-emerald-500"}`} />
      {isLow ? "Low" : "Available"}
    </span>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default function ItemPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { list, draft, editingId, submitting, error } = useSelector((state) => state.items);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [undoItemId, setUndoItemId] = useState(null);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const undoTimerRef = useRef(null);

  const safeItems = Array.isArray(list) ? list : [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = normalizedSearch
    ? safeItems.filter((item) => {
        const searchableText = [
          item.id,
          item.item_name,
          item.sku,
          item.category,
          item.unit,
          item.stock_quantity,
          item.low_stock_threshold,
          item.average_cost,
          item.sale_price,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : safeItems;
  const totalStock = safeItems.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0);
  const filteredStock = filteredItems.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0);
  const totalInventoryValue = safeItems.reduce(
    (sum, item) => sum + Number(item.stock_quantity || 0) * Number(item.average_cost || 0),
    0,
  );
  const lowStockCount = safeItems.filter((item) => {
    const threshold = Number(item.low_stock_threshold || 0);
    return threshold > 0 && Number(item.stock_quantity || 0) <= threshold;
  }).length;
  const categoryCount = new Set(safeItems.map((item) => item.category).filter(Boolean)).size;

  const clearUndo = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoItemId(null);
  };

  const validate = () => {
    const newErrors = {};
    const requiredFields = [
      "item_name",
      "sku",
      "category",
      "unit",
      "average_cost",
      "sale_price",
      "stock_quantity",
      "low_stock_threshold",
    ];

    requiredFields.forEach((field) => {
      if (!draft[field] || String(draft[field]).trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    if (draft.average_cost && isNaN(draft.average_cost)) {
      newErrors.average_cost = "Average cost must be a number";
    }

    if (draft.sale_price && isNaN(draft.sale_price)) {
      newErrors.sale_price = "Sale price must be a number";
    }

    if (draft.stock_quantity && isNaN(draft.stock_quantity)) {
      newErrors.stock_quantity = "Stock quantity must be a number";
    }

    if (draft.low_stock_threshold && isNaN(draft.low_stock_threshold)) {
      newErrors.low_stock_threshold = "Low stock threshold must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const promise = dispatch(fetchItems());
    return () => {
      promise.abort();
      clearUndo();
    };
  }, [dispatch, location.key]);

  useEffect(() => {
    let lastFetch;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        lastFetch?.abort();
        lastFetch = dispatch(fetchItems());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lastFetch?.abort();
    };
  }, [dispatch]);

  const handleOpenCreateModal = () => {
    dispatch(resetItemDraft());
    setErrors({});
    setActiveActionItem(null);
    clearUndo();
    setIsItemModalOpen(true);
  };

  const handleCloseItemModal = () => {
    dispatch(resetItemDraft());
    setErrors({});
    setActiveActionItem(null);
    setIsItemModalOpen(false);
  };

  const handleFieldChange = (field, value) => {
    dispatch(setItemDraftField({ field, value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (editingId) {
      const resultAction = await dispatch(updateItem());
      if (updateItem.fulfilled.match(resultAction)) {
        dispatch(fetchItems());
        setIsItemModalOpen(false);
        setErrors({});
      }
    } else {
      const resultAction = await dispatch(createItem());
      if (createItem.fulfilled.match(resultAction)) {
        dispatch(fetchItems());
        setIsItemModalOpen(false);
        setErrors({});
      }
    }
  };

  const handleEdit = (item) => {
    dispatch(editItem(item));
    setActiveActionItem(null);
    setErrors({});
    clearUndo();
    setIsItemModalOpen(true);
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setActiveActionItem(null);
    clearUndo();
  };

  const handleCloseView = () => {
    setSelectedItem(null);
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.item_name}"? This action can be undone for 5 seconds.`,
    );
    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(deleteItem(item.id));
    if (deleteItem.fulfilled.match(resultAction)) {
      dispatch(fetchItems());
      if (activeActionItem === item.id) {
        setActiveActionItem(null);
      }
      if (editingId === item.id) {
        setIsItemModalOpen(false);
      }
      clearUndo();
      setUndoItemId(item.id);
      undoTimerRef.current = setTimeout(() => {
        clearUndo();
      }, 5000);
    }
  };

  const handleUndo = async () => {
    if (!undoItemId) {
      return;
    }

    const resultAction = await dispatch(restoreItem(undoItemId));
    clearUndo();

    if (restoreItem.fulfilled.match(resultAction)) {
      dispatch(fetchItems());
    }
  };

  const handleCancelEdit = () => {
    dispatch(resetItemDraft());
    setActiveActionItem(null);
    setErrors({});
    setIsItemModalOpen(false);
    clearUndo();
  };

  const inputFields = [
    ["item_name", "Item Name", "text", "Enter item name (e.g., Almonds)"],
    ["sku", "SKU", "text", "Enter unique SKU (e.g., ALM-001)"],
    ["category", "Category", "text", "Enter category (e.g., Nuts)"],
    ["unit", "Unit", "text", "Enter unit (e.g., kg)"],
    ["average_cost", "Average Cost", "number", "Enter average cost per unit"],
    ["sale_price", "Sale Price", "number", "Enter sale price per unit"],
    ["stock_quantity", "Opening Stock", "number", "Enter initial stock quantity"],
    ["low_stock_threshold", "Low Stock Threshold", "number", "Enter low stock alert threshold"],
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              Inventory Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Items</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage dry fruit products, pricing, stock quantity, and reorder thresholds from one controlled view.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              onClick={handleOpenCreateModal}
            >
              <Plus size={17} className="text-[#ffcf83]" />
              Create Item
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Inventory Value</p>
              <p className="mt-2 text-2xl font-bold text-[#ffcf83]">{formatCurrency(totalInventoryValue)}</p>
              <p className="mt-1 text-sm text-slate-400">Based on current stock and average cost</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryMetric title="Total Items" value={safeItems.length} helper="Active product records" icon={Boxes} accent />
        <InventoryMetric title="Current Stock" value={totalStock.toLocaleString()} helper="Units available in inventory" icon={Warehouse} />
        <InventoryMetric title="Categories" value={categoryCount} helper="Product groups in use" icon={Tags} />
        <InventoryMetric title="Low Stock" value={lowStockCount} helper="Items at or below threshold" icon={AlertTriangle} accent />
      </section>

      {undoItemId ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <RotateCcw size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Item deleted</p>
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Product Master</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Item Catalogue</h2>
              <p className="mt-1 text-sm text-slate-500">Clean item list with item number, stock, cost, and sale price.</p>
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
                    setActiveActionItem(null);
                  }}
                  placeholder="Search item, SKU, category..."
                  className="no-native-search-clear h-10 rounded-lg border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-medium"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveActionItem(null);
                    }}
                    aria-label="Clear item search"
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                {filteredItems.length}
                {normalizedSearch ? ` of ${safeItems.length}` : ""} records
              </div>
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <Warehouse size={15} className="text-slate-500" />
                {filteredStock.toLocaleString()} units
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={handleOpenCreateModal}
              >
                <Plus size={15} className="text-[#ffcf83]" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="w-[95px] px-5 py-3 font-semibold">Item No</th>
                  <th className="min-w-[250px] px-5 py-3 font-semibold">Item</th>
                  <th className="min-w-[160px] px-5 py-3 font-semibold">Category</th>
                  <th className="min-w-[170px] px-5 py-3 font-semibold">Stock</th>
                  <th className="min-w-[140px] px-5 py-3 text-right font-semibold">Avg. Cost</th>
                  <th className="min-w-[140px] px-5 py-3 text-right font-semibold">Sale Price</th>
                  <th className="w-[130px] px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((item, index) => (
                  <tr key={item.id || index} className="group transition hover:bg-[#ffcf83]/[0.08]">
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold tabular-nums text-slate-600 group-hover:border-[#ffcf83]/70 group-hover:bg-white">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-[240px]">
                        <button
                          type="button"
                          className="text-left font-semibold text-slate-950 transition hover:text-slate-700"
                          onClick={() => handleView(item)}
                        >
                          {item.item_name}
                        </button>
                        <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">SKU: {item.sku || "-"}</span>
                          <span className="uppercase tracking-wide text-slate-400">{item.unit || "unit"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <p className="font-medium text-slate-700">{item.category || "Uncategorised"}</p>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-[145px] space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums text-slate-950">{item.stock_quantity}</span>
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.unit || "unit"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StockStatus stock={item.stock_quantity} threshold={item.low_stock_threshold} />
                          <span className="text-xs text-slate-400">Limit {item.low_stock_threshold ?? "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right align-middle font-semibold tabular-nums text-slate-700">
                      {formatCurrency(item.average_cost)}
                    </td>
                    <td className="px-5 py-4 text-right align-middle font-semibold tabular-nums text-slate-950">
                      {formatCurrency(item.sale_price)}
                    </td>
                    <td className="px-5 py-4 text-right align-middle">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => setActiveActionItem(activeActionItem === item.id ? null : item.id)}
                        >
                          Actions
                          <ChevronDown size={15} />
                        </button>

                        {activeActionItem === item.id ? (
                          <div className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                              <span className="text-sm font-semibold text-slate-700">Quick actions</span>
                              <button
                                type="button"
                                className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                                onClick={() => setActiveActionItem(null)}
                                aria-label="Close actions"
                              >
                                <X size={15} />
                              </button>
                            </div>
                            <div className="flex flex-col gap-1 p-2">
                              <button
                                type="button"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                onClick={() => handleView(item)}
                              >
                                <Eye size={16} />
                                View
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil size={16} />
                                Update
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                onClick={() => handleDelete(item)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/25 text-slate-950">
              <PackagePlus size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-950">
              {safeItems.length ? "No matching items found" : "No items found"}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {safeItems.length
                ? "Try another item name, SKU, category, unit, or price."
                : "Create your first product record from the add item modal to start managing stock and pricing."}
            </p>
            {safeItems.length ? (
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setSearchTerm("")}
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
                Add Item
              </button>
            )}
          </div>
        )}
      </section>

      {isItemModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {editingId ? "Update Item" : "New Item"}
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  {editingId ? "Edit Item Record" : "Create Item"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update item details without changing the existing inventory workflow."
                    : "Enter product details and save the record to the item catalogue."}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                onClick={handleCloseItemModal}
                aria-label="Close item form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-118px)] overflow-y-auto p-6">
              {error ? (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {inputFields.map(([field, label, type, placeholder]) => (
                    <div key={field}>
                      <label className="label">{label}</label>
                      <input
                        type={type}
                        step={type === "number" ? "0.01" : undefined}
                        min={type === "number" ? "0" : undefined}
                        value={draft[field] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`mt-1.5 border px-3 py-2.5 shadow-sm ${
                          errors[field]
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-slate-300 focus:border-slate-500 focus:ring-slate-200"
                        }`}
                      />
                      {errors[field] ? <p className="mt-1.5 text-sm font-medium text-red-500">{errors[field]}</p> : null}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button className="secondary-btn" type="button" onClick={handleCloseItemModal}>
                    Cancel
                  </button>
                  <button className="secondary-btn" type="button" onClick={() => dispatch(resetItemDraft())}>
                    Reset
                  </button>
                  {editingId ? (
                    <button className="secondary-btn" type="button" onClick={handleCancelEdit}>
                      Cancel Edit
                    </button>
                  ) : null}
                  <button className="primary-btn inline-flex items-center gap-2" type="submit" disabled={submitting}>
                    <Save size={16} />
                    {editingId ? "Update Item" : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Item Details</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{selectedItem.item_name}</h3>
                <p className="mt-1 text-sm text-slate-500">Complete product information and inventory thresholds.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                onClick={handleCloseView}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <DetailBlock label="Item" value={selectedItem.item_name} />
              <DetailBlock label="SKU" value={selectedItem.sku || "-"} />
              <DetailBlock label="Category" value={selectedItem.category || "-"} />
              <DetailBlock label="Unit" value={selectedItem.unit || "-"} />
              <DetailBlock label="Stock Quantity" value={selectedItem.stock_quantity} />
              <DetailBlock label="Average Cost" value={formatCurrency(selectedItem.average_cost)} />
              <DetailBlock label="Sale Price" value={formatCurrency(selectedItem.sale_price)} />
              <DetailBlock label="Low Stock Threshold" value={selectedItem.low_stock_threshold} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
