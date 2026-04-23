import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import {
  createSupplier,
  deleteSupplier,
  editSupplier,
  fetchSuppliers,
  resetSupplierDraft,
  restoreSupplier,
  setSupplierDraftField,
  updateSupplier,
} from "../../features/suppliers/suppliersSlice";
import { fetchSupplierAccounts } from "../../features/accounts/accountsSlice";
import { formatCurrency } from "../../utils/formatters";

export default function SupplierPage() {
  const dispatch = useDispatch();
  const { list, draft, editingId, submitting, error } = useSelector((state) => state.suppliers);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
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

  useEffect(() => {
    dispatch(fetchSuppliers());
    return () => {
      clearUndo();
    };
  }, [dispatch]);

  const validate = () => {
    const newErrors = {};
    const requiredFields = ["supplier_name", "contact_person", "phone", "email", "address", "opening_balance"];

    requiredFields.forEach(field => {
      if (!draft[field] || draft[field].toString().trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    if (draft.phone && !/^\d{11}$/.test(draft.phone)) {
      newErrors.phone = "Phone must be exactly 11 digits";
    }

    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      newErrors.email = "Invalid email format";
    }

    if (draft.opening_balance && isNaN(draft.opening_balance)) {
      newErrors.opening_balance = "Opening balance must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    if (editingId) {
      const resultAction = await dispatch(updateSupplier());
      if (updateSupplier.fulfilled.match(resultAction)) {
        dispatch(fetchSuppliers());
        dispatch(fetchSupplierAccounts());
        alert("Supplier updated successfully.");
      }
    } else {
      const resultAction = await dispatch(createSupplier());
      if (createSupplier.fulfilled.match(resultAction)) {
        dispatch(fetchSuppliers());
        dispatch(fetchSupplierAccounts());
        alert("Supplier created successfully.");
      }
    }
  };

  const handleFieldChange = (field, value) => {
    dispatch(setSupplierDraftField({ field, value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleEdit = (supplier) => {
    dispatch(editSupplier(supplier));
    setActiveActionItem(null);
    clearUndo();
  };

  const handleView = (supplier) => {
    setSelectedSupplier(supplier);
    setActiveActionItem(null);
    clearUndo();
  };

  const handleCloseView = () => {
    setSelectedSupplier(null);
  };

  const handleDelete = async (supplier) => {
    const confirmed = window.confirm(
      `Delete "${supplier.supplier_name}"? This action can be undone for 5 seconds.`,
    );
    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(deleteSupplier(supplier.id));
    if (deleteSupplier.fulfilled.match(resultAction)) {
      dispatch(fetchSuppliers());
      dispatch(fetchSupplierAccounts());
      if (activeActionItem === supplier.id) {
        setActiveActionItem(null);
      }
      clearUndo();
      setUndoItemId(supplier.id);
      undoTimerRef.current = setTimeout(() => {
        clearUndo();
      }, 5000);
    }
  };

  const handleUndo = async () => {
    if (!undoItemId) {
      return;
    }

    const resultAction = await dispatch(restoreSupplier(undoItemId));
    clearUndo();

    if (restoreSupplier.fulfilled.match(resultAction)) {
      dispatch(fetchSuppliers());
      dispatch(fetchSupplierAccounts());
    }
  };

  const handleCancelEdit = () => {
    dispatch(resetSupplierDraft());
    setActiveActionItem(null);
    clearUndo();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="page-title">Suppliers</h1>
        <p className="page-subtitle">Supplier master data for purchase and payable workflows.</p>

        <div className="mt-4">
          {undoItemId ? (
            <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">Supplier deleted. Undo within 5 seconds.</p>
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
              { key: "seq", title: "No.", render: (row, index) => index + 1 },
              { key: "id", title: "Supplier ID" },
              { key: "supplier_name", title: "Supplier" },
              { key: "contact_person", title: "Contact Person" },
              { key: "phone", title: "Phone" },
              { key: "opening_balance", title: "Opening Balance", render: (row) => formatCurrency(row.opening_balance) },
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
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">{editingId ? "Edit Supplier" : "Create Supplier"}</h2>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {[
            ["supplier_name", "Supplier Name", "text", "Enter supplier name"],
            ["contact_person", "Contact Person", "text", "Enter contact person name"],
            ["phone", "Phone", "tel", "11 digits phone number (e.g., 01234567890)"],
            ["email", "Email", "email", "example@email.com"],
            ["address", "Address", "textarea", "Enter full address"],
            ["opening_balance", "Opening Balance", "number", "Enter opening balance amount"],
          ].map(([field, label, type, placeholder]) => (
            <div key={field}>
              <label className="label">{label}</label>
              {type === "textarea" ? (
                <textarea
                  value={draft[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full p-2 border rounded"
                />
              ) : (
                <input
                  type={type}
                  value={draft[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full p-2 border rounded"
                />
              )}
              {errors[field] && <p className="text-red-500 text-sm mt-1">{errors[field]}</p>}
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {editingId ? "Update Supplier" : "Save Supplier"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => dispatch(resetSupplierDraft())}>
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

      {selectedSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Supplier Details</h3>
                <p className="text-sm text-slate-600">Full supplier information for {selectedSupplier.supplier_name}.</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCloseView}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-semibold">Supplier ID</p>
                <p>{selectedSupplier.id}</p>
              </div>
              <div>
                <p className="font-semibold">Supplier</p>
                <p>{selectedSupplier.supplier_name}</p>
              </div>
              <div>
                <p className="font-semibold">Contact Person</p>
                <p>{selectedSupplier.contact_person || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Phone</p>
                <p>{selectedSupplier.phone || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <p>{selectedSupplier.email || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Opening Balance</p>
                <p>{formatCurrency(selectedSupplier.opening_balance)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold">Address</p>
                <p>{selectedSupplier.address || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}