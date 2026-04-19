import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
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

export default function ItemPage() {
  const dispatch = useDispatch();
  const { list, draft, editingId, submitting, error } = useSelector((state) => state.items);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [undoItemId, setUndoItemId] = useState(null);
  const [errors, setErrors] = useState({});
  const undoTimerRef = useRef(null);

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
    dispatch(fetchItems());
    return () => {
      clearUndo();
    };
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (editingId) {
      const resultAction = await dispatch(updateItem());
      if (updateItem.fulfilled.match(resultAction)) {
        dispatch(fetchItems());
      }
    } else {
      const resultAction = await dispatch(createItem());
      if (createItem.fulfilled.match(resultAction)) {
        dispatch(fetchItems());
      }
    }
  };

  const handleEdit = (item) => {
    dispatch(editItem(item));
    setActiveActionItem(null);
    clearUndo();
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
    clearUndo();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div className="mb-4">
          <h1 className="page-title">Items</h1>
          <p className="page-subtitle">Manage dry fruit products, pricing, and stock thresholds.</p>
        </div>
        {undoItemId ? (
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Item deleted. Undo within 5 seconds.</p>
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
            { key: "item_name", title: "Item" },
            { key: "sku", title: "SKU" },
            { key: "category", title: "Category" },
            { key: "unit", title: "Unit" },
            { key: "stock_quantity", title: "Stock" },
            { key: "sale_price", title: "Sale Price", render: (row) => formatCurrency(row.sale_price) },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    className="secondary-btn py-1 px-3"
                    onClick={() => setActiveActionItem(activeActionItem === row.id ? null : row.id)}
                  >
                    Actions
                  </button>

                  {activeActionItem === row.id ? (
                    <div className="absolute right-0 z-20 mt-2 min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 bg-slate-50">
                        <span className="text-sm font-medium text-slate-700">Choose action</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          onClick={() => setActiveActionItem(null)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 p-2">
                        <button
                          type="button"
                          className="text-left rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                          onClick={() => handleView(row)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-left rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                          onClick={() => handleEdit(row)}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="text-left rounded-md px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                          onClick={() => handleDelete(row)}
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

      <div className="card">
        <h2 className="text-lg font-semibold">{editingId ? "Edit Item" : "Create Item"}</h2>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {[
            ["item_name", "Item Name", "text", "Enter item name (e.g., Almonds)"],
            ["sku", "SKU", "text", "Enter unique SKU (e.g., ALM-001)"],
            ["category", "Category", "text", "Enter category (e.g., Nuts)"],
            ["unit", "Unit", "text", "Enter unit (e.g., kg)"],
            ["average_cost", "Average Cost", "number", "Enter average cost per unit"],
            ["sale_price", "Sale Price", "number", "Enter sale price per unit"],
            ["stock_quantity", "Opening Stock", "number", "Enter initial stock quantity"],
            ["low_stock_threshold", "Low Stock Threshold", "number", "Enter low stock alert threshold"],
          ].map(([field, label, type, placeholder]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input
                type={type}
                step={type === "number" ? "0.01" : undefined}
                min={type === "number" ? "0" : undefined}
                value={draft[field] ?? ""}
                placeholder={placeholder}
                onChange={(e) => {
                  dispatch(setItemDraftField({ field, value: e.target.value }));
                  if (errors[field]) {
                    setErrors({ ...errors, [field]: "" });
                  }
                }}
                className="w-full p-2 border rounded"
              />
              {errors[field] && <p className="text-red-500 text-sm mt-1">{errors[field]}</p>}
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {editingId ? "Update Item" : "Save Item"}
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                dispatch(resetItemDraft());
                setErrors({});
              }}
            >
              Reset
            </button>
            {editingId ? (
              <button className="secondary-btn" type="button" onClick={handleCancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Item Details</h3>
                <p className="text-sm text-slate-600">Full item information for {selectedItem.item_name}.</p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleCloseView}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-semibold">Item</p>
                <p>{selectedItem.item_name}</p>
              </div>
              <div>
                <p className="font-semibold">SKU</p>
                <p>{selectedItem.sku || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Category</p>
                <p>{selectedItem.category || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Unit</p>
                <p>{selectedItem.unit || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Stock Quantity</p>
                <p>{selectedItem.stock_quantity}</p>
              </div>
              <div>
                <p className="font-semibold">Average Cost</p>
                <p>{formatCurrency(selectedItem.average_cost)}</p>
              </div>
              <div>
                <p className="font-semibold">Sale Price</p>
                <p>{formatCurrency(selectedItem.sale_price)}</p>
              </div>
              <div>
                <p className="font-semibold">Low Stock Threshold</p>
                <p>{selectedItem.low_stock_threshold}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
