import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  BadgeDollarSign,
  Building2,
  ChevronDown,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
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

const accentColor = "#ffcf83";

function SupplierMetric({ title, value, helper, icon: Icon, accent = false }) {
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

export default function SupplierPage() {
  const dispatch = useDispatch();
  const { list, draft, editingId, submitting, error } = useSelector((state) => state.suppliers);
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [undoItemId, setUndoItemId] = useState(null);
  const [errors, setErrors] = useState({});
  const undoTimerRef = useRef(null);

  const suppliers = Array.isArray(list) ? list : [];

  const supplierStats = useMemo(() => {
    const totalPayable = suppliers.reduce((sum, supplier) => sum + Number(supplier.opening_balance || 0), 0);
    const suppliersWithPayable = suppliers.filter((supplier) => Number(supplier.opening_balance || 0) > 0).length;
    const suppliersWithEmail = suppliers.filter((supplier) => supplier.email).length;

    return {
      totalSuppliers: suppliers.length,
      suppliersWithPayable,
      suppliersWithEmail,
      totalPayable,
    };
  }, [suppliers]);

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

    requiredFields.forEach((field) => {
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

  const handleOpenCreateModal = () => {
    dispatch(resetSupplierDraft());
    setErrors({});
    setActiveActionItem(null);
    clearUndo();
    setIsSupplierModalOpen(true);
  };

  const handleCloseSupplierModal = () => {
    dispatch(resetSupplierDraft());
    setErrors({});
    setActiveActionItem(null);
    setIsSupplierModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    if (editingId) {
      const resultAction = await dispatch(updateSupplier());
      if (updateSupplier.fulfilled.match(resultAction)) {
        dispatch(fetchSuppliers());
        dispatch(fetchSupplierAccounts());
        setIsSupplierModalOpen(false);
        setErrors({});
        alert("Supplier updated successfully.");
      }
    } else {
      const resultAction = await dispatch(createSupplier());
      if (createSupplier.fulfilled.match(resultAction)) {
        dispatch(fetchSuppliers());
        dispatch(fetchSupplierAccounts());
        setIsSupplierModalOpen(false);
        setErrors({});
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
    setErrors({});
    clearUndo();
    setIsSupplierModalOpen(true);
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
      if (editingId === supplier.id) {
        setIsSupplierModalOpen(false);
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
    setErrors({});
    setIsSupplierModalOpen(false);
    clearUndo();
  };

  const inputFields = [
    ["supplier_name", "Supplier Name", "text", "Enter supplier name"],
    ["contact_person", "Contact Person", "text", "Enter contact person name"],
    ["phone", "Phone", "tel", "11 digits phone number (e.g., 01234567890)"],
    ["email", "Email", "email", "example@email.com"],
    ["address", "Address", "textarea", "Enter full address"],
    ["opening_balance", "Opening Balance", "number", "Enter opening balance amount"],
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              Supplier Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Suppliers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage supplier master data, contact persons, and opening balances for purchase and payable workflows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              onClick={handleOpenCreateModal}
            >
              <Plus size={17} className="text-[#ffcf83]" />
              Create Supplier
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Supplier Payable Due</p>
              <p className="mt-2 text-2xl font-bold text-[#ffcf83]">{formatCurrency(supplierStats.totalPayable)}</p>
              <p className="mt-1 text-sm text-slate-400">Total current balance across supplier records</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SupplierMetric title="Total Suppliers" value={supplierStats.totalSuppliers} helper="Registered supplier records" icon={Truck} accent />
        <SupplierMetric title="Payable Due" value={formatCurrency(supplierStats.totalPayable)} helper="Total supplier balance" icon={BadgeDollarSign} />
        <SupplierMetric title="With Payable" value={supplierStats.suppliersWithPayable} helper="Suppliers with pending amount" icon={AlertCircle} accent />
        <SupplierMetric title="Email Records" value={supplierStats.suppliersWithEmail} helper="Suppliers with email saved" icon={Mail} />
      </section>

      {undoItemId ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <RotateCcw size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Supplier deleted</p>
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

      {!isSupplierModalOpen && error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Supplier Master</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Supplier Directory</h2>
              <p className="mt-1 text-sm text-slate-500">Clean supplier list with ID, contact details, address, and payable balance.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                {supplierStats.totalSuppliers} records
              </div>
              <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <BadgeDollarSign size={15} className="text-slate-500" />
                {formatCurrency(supplierStats.totalPayable)} due
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={handleOpenCreateModal}
              >
                <Plus size={15} className="text-[#ffcf83]" />
                Add Supplier
              </button>
            </div>
          </div>
        </div>

        {suppliers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="w-[82px] px-5 py-3 font-semibold">No.</th>
                  <th className="w-[120px] px-5 py-3 font-semibold">Supplier ID</th>
                  <th className="min-w-[260px] px-5 py-3 font-semibold">Supplier</th>
                  <th className="min-w-[210px] px-5 py-3 font-semibold">Contact Person</th>
                  <th className="min-w-[150px] px-5 py-3 font-semibold">Phone</th>
                  <th className="min-w-[170px] px-5 py-3 text-right font-semibold">Opening Balance</th>
                  <th className="w-[130px] px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {suppliers.map((supplier, index) => {
                  const hasPayable = Number(supplier.opening_balance || 0) > 0;

                  return (
                    <tr key={supplier.id || index} className="group transition hover:bg-[#ffcf83]/[0.08]">
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold tabular-nums text-slate-600 group-hover:border-[#ffcf83]/70 group-hover:bg-white">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 shadow-sm">
                          {supplier.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="min-w-[250px]">
                          <button
                            type="button"
                            className="text-left font-semibold text-slate-950 transition hover:text-slate-700"
                            onClick={() => handleView(supplier)}
                          >
                            {supplier.supplier_name}
                          </button>
                          <div className="mt-1.5 flex max-w-[360px] items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{supplier.address || "No address"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="min-w-[190px]">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <UserRound size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{supplier.contact_person || "-"}</span>
                          </div>
                          <div className="mt-1.5 flex max-w-[220px] items-center gap-2 text-xs font-medium text-slate-500">
                            <Mail size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{supplier.email || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-700">
                          <Phone size={14} className="text-slate-400" />
                          <span className="tabular-nums">{supplier.phone || "-"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div
                          className={`ml-auto inline-flex min-w-[130px] flex-col rounded-xl border px-3 py-2 text-right ${
                            hasPayable
                              ? "border-[#ffcf83]/70 bg-[#ffcf83]/20 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="font-semibold tabular-nums">{formatCurrency(supplier.opening_balance)}</span>
                          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {hasPayable ? "Payable" : "Clear"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            onClick={() => setActiveActionItem(activeActionItem === supplier.id ? null : supplier.id)}
                          >
                            Actions
                            <ChevronDown size={15} />
                          </button>

                          {activeActionItem === supplier.id ? (
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
                                  onClick={() => handleView(supplier)}
                                >
                                  <Eye size={16} />
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => handleEdit(supplier)}
                                >
                                  <Pencil size={16} />
                                  Update
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                  onClick={() => handleDelete(supplier)}
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
              <Building2 size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-950">No suppliers found</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first supplier record from the add supplier modal to start managing purchases and payables.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} className="text-[#ffcf83]" />
              Add Supplier
            </button>
          </div>
        )}
      </section>

      {isSupplierModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {editingId ? "Update Supplier" : "New Supplier"}
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  {editingId ? "Edit Supplier Record" : "Create Supplier"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update supplier details without changing the existing workflow."
                    : "Enter supplier details and save the record to the master directory."}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                onClick={handleCloseSupplierModal}
                aria-label="Close supplier form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-118px)] overflow-y-auto p-6">
              {error ? (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {inputFields.map(([field, label, type, placeholder]) => (
                    <div key={field} className={type === "textarea" ? "sm:col-span-2" : ""}>
                      <label className="label">{label}</label>
                      {type === "textarea" ? (
                        <textarea
                          value={draft[field] ?? ""}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          placeholder={placeholder}
                          rows="3"
                          className={`mt-1.5 border px-3 py-2.5 shadow-sm ${
                            errors[field]
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-slate-300 focus:border-slate-500 focus:ring-slate-200"
                          }`}
                        />
                      ) : (
                        <input
                          type={type}
                          step={type === "number" ? "0.01" : undefined}
                          min={type === "number" ? "0" : undefined}
                          value={draft[field] ?? ""}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          placeholder={placeholder}
                          className={`mt-1.5 border px-3 py-2.5 shadow-sm ${
                            errors[field]
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-slate-300 focus:border-slate-500 focus:ring-slate-200"
                          }`}
                        />
                      )}
                      {errors[field] ? <p className="mt-1.5 text-sm font-medium text-red-500">{errors[field]}</p> : null}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button className="secondary-btn" type="button" onClick={handleCloseSupplierModal}>
                    Cancel
                  </button>
                  <button className="secondary-btn" type="button" onClick={() => dispatch(resetSupplierDraft())}>
                    Reset
                  </button>
                  {editingId ? (
                    <button className="secondary-btn" type="button" onClick={handleCancelEdit}>
                      Cancel Edit
                    </button>
                  ) : null}
                  <button className="primary-btn inline-flex items-center gap-2" type="submit" disabled={submitting}>
                    <Save size={16} />
                    {editingId ? "Update Supplier" : "Save Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {selectedSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier Details</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{selectedSupplier.supplier_name}</h3>
                <p className="mt-1 text-sm text-slate-500">Complete supplier information and current payable balance.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                onClick={handleCloseView}
                aria-label="Close supplier details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <DetailBlock label="Supplier ID" value={selectedSupplier.id} />
              <DetailBlock label="Supplier" value={selectedSupplier.supplier_name || "-"} />
              <DetailBlock label="Contact Person" value={selectedSupplier.contact_person || "-"} />
              <DetailBlock label="Phone" value={selectedSupplier.phone || "-"} />
              <DetailBlock label="Email" value={selectedSupplier.email || "-"} />
              <DetailBlock label="Opening Balance" value={formatCurrency(selectedSupplier.opening_balance)} />
              <DetailBlock label="Payable Due" value={formatCurrency(selectedSupplier.opening_balance)} />
              <DetailBlock label="Address" value={selectedSupplier.address || "-"} wide />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
