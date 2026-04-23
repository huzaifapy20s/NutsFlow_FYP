import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTable from "../../components/common/DataTable";
import {
  createCustomer,
  deleteCustomer,
  editCustomer,
  fetchCustomers,
  resetCustomerDraft,
  restoreCustomer,
  setCustomerDraftField,
  updateCustomer,
} from "../../features/customers/customersSlice";
import { formatCurrency } from "../../utils/formatters";

export default function CustomerPage() {
  const dispatch = useDispatch();
  const { list, draft, editingId, submitting, error } = useSelector((state) => state.customers);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
    dispatch(fetchCustomers());
    return () => {
      clearUndo();
    };
  }, [dispatch]);

  const validate = () => {
    const newErrors = {};
    const requiredFields = ["full_name", "phone", "email", "address", "opening_balance"];

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
      const resultAction = await dispatch(updateCustomer());
      if (updateCustomer.fulfilled.match(resultAction)) {
        dispatch(fetchCustomers());
        alert("Customer updated successfully.");
      }
    } else {
      const resultAction = await dispatch(createCustomer());
      if (createCustomer.fulfilled.match(resultAction)) {
        dispatch(fetchCustomers());
        alert("Customer created successfully.");
      }
    }
  };

  const handleFieldChange = (field, value) => {
    dispatch(setCustomerDraftField({ field, value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleEdit = (customer) => {
    dispatch(editCustomer(customer));
    setActiveActionItem(null);
    clearUndo();
  };

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setActiveActionItem(null);
    clearUndo();
  };

  const handleCloseView = () => {
    setSelectedCustomer(null);
  };

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Delete "${customer.full_name}"? This action can be undone for 5 seconds.`,
    );
    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(deleteCustomer(customer.id));
    if (deleteCustomer.fulfilled.match(resultAction)) {
      dispatch(fetchCustomers());
      if (activeActionItem === customer.id) {
        setActiveActionItem(null);
      }
      clearUndo();
      setUndoItemId(customer.id);
      undoTimerRef.current = setTimeout(() => {
        clearUndo();
      }, 5000);
    }
  };

  const handleUndo = async () => {
    if (!undoItemId) {
      return;
    }

    const resultAction = await dispatch(restoreCustomer(undoItemId));
    clearUndo();

    if (restoreCustomer.fulfilled.match(resultAction)) {
      dispatch(fetchCustomers());
    }
  };

  const handleCancelEdit = () => {
    dispatch(resetCustomerDraft());
    setActiveActionItem(null);
    clearUndo();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="page-title">Customers</h1>
        <p className="page-subtitle">Customer master data and future credit-sale linking.</p>

        <div className="mt-4">
          {undoItemId ? (
            <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">Customer deleted. Undo within 5 seconds.</p>
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
              { key: "id", title: "Customer ID" },
              { key: "full_name", title: "Name" },
              { key: "phone", title: "Phone" },
              { key: "email", title: "Email" },
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
        <h2 className="text-lg font-semibold">{editingId ? "Edit Customer" : "Create Customer"}</h2>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {[
            ["full_name", "Full Name", "text", "Enter full name"],
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
              {editingId ? "Update Customer" : "Save Customer"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => dispatch(resetCustomerDraft())}>
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

      {selectedCustomer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Customer Details</h3>
                <p className="text-sm text-slate-600">Full customer information for {selectedCustomer.full_name}.</p>
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
                <p className="font-semibold">Customer ID</p>
                <p>{selectedCustomer.id}</p>
              </div>
              <div>
                <p className="font-semibold">Name</p>
                <p>{selectedCustomer.full_name}</p>
              </div>
              <div>
                <p className="font-semibold">Phone</p>
                <p>{selectedCustomer.phone || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <p>{selectedCustomer.email || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Opening Balance</p>
                <p>{formatCurrency(selectedCustomer.opening_balance)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold">Address</p>
                <p>{selectedCustomer.address || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}