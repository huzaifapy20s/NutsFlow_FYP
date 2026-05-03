import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  CalendarDays,
  Edit,
  Eye,
  FileText,
  ReceiptText,
  Search,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { fetchItems } from "../../features/items/itemsSlice";
import { fetchRecentBills } from "../../features/reports/reportsSlice";
import { formatCurrency } from "../../utils/formatters";

const accentColor = "#ffcf83";

function toNumber(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function normalizeStatus(status) {
  return String(status || "unpaid").replace(/_/g, " ");
}

function StatusBadge({ status }) {
  const normalized = String(status || "unpaid").toLowerCase();
  const styles =
    normalized === "paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "partial"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalizeStatus(status)}
    </span>
  );
}

function BillMetric({ title, value, helper, icon: Icon, accent = false }) {
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

export default function BillDetailsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { recentBills, loading, error } = useSelector((state) => state.reports);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const bills = Array.isArray(recentBills) ? recentBills : [];
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredBills = useMemo(() => {
    if (!normalizedSearch) return bills;

    return bills.filter((bill) => {
      const billDate = formatDate(bill.sale_date);
      const searchableText = [
        bill.id,
        bill.invoice_number,
        bill.customer_name || "Walk-in customer",
        bill.sale_date,
        billDate,
        bill.payment_status,
        bill.total_amount,
        bill.paid_amount,
        bill.balance_due,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [bills, normalizedSearch]);

  const billStats = useMemo(() => {
    const totalAmount = bills.reduce(
      (sum, bill) => sum + toNumber(bill.total_amount),
      0,
    );
    const paidAmount = bills.reduce(
      (sum, bill) => sum + toNumber(bill.paid_amount),
      0,
    );
    const balanceDue = bills.reduce(
      (sum, bill) => sum + toNumber(bill.balance_due),
      0,
    );
    const paidBills = bills.filter(
      (bill) => String(bill.payment_status).toLowerCase() === "paid",
    ).length;
    const dueBills = bills.filter(
      (bill) => toNumber(bill.balance_due) > 0,
    ).length;

    return { totalAmount, paidAmount, balanceDue, paidBills, dueBills };
  }, [bills]);

  useEffect(() => {
    dispatch(fetchRecentBills());
  }, [dispatch]);

  const handleViewBill = (billId) => {
    navigate(`/bills/${billId}`);
  };

  const handleUpdateBill = (billId) => {
    navigate(`/bills/${billId}/edit`);
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    setDeleteLoading(billId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/sales/${billId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${JSON.parse(localStorage.getItem("dfms_auth") || "{}")?.accessToken || ""}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete bill");
      }

      dispatch(fetchRecentBills());
      dispatch(fetchItems());
    } catch (error) {
      console.error("Failed to delete bill:", error);
      alert("Failed to delete bill");
    } finally {
      setDeleteLoading(null);
    }
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
              Sales Records
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Bill Details
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review customer bills, payment status, outstanding balances, and
              receipt actions from one clean workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-[260px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total Outstanding
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-[#ffcf83]">
                <WalletCards size={18} />
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(billStats.balanceDue)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BillMetric
          title="Total bills"
          value={bills.length}
          helper={`${billStats.paidBills} fully paid`}
          icon={ReceiptText}
          accent
        />
        <BillMetric
          title="Sales value"
          value={formatCurrency(billStats.totalAmount)}
          helper="Total bill amount"
          icon={FileText}
        />
        <BillMetric
          title="Collected"
          value={formatCurrency(billStats.paidAmount)}
          helper="Paid amount received"
          icon={Banknote}
        />
        <BillMetric
          title="Due bills"
          value={billStats.dueBills}
          helper={formatCurrency(billStats.balanceDue)}
          icon={Users}
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading bills...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Bills Directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                All saved bills with payment and balance tracking.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search customer, invoice, date..."
                  className="no-native-search-clear h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-10 text-sm font-medium"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear bill search"
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                {filteredBills.length}
                {normalizedSearch ? ` of ${bills.length}` : ""} records
              </div>
            </div>
          </div>

          {filteredBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">No.</th>
                    <th className="px-5 py-4 font-semibold">Invoice</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Total
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">Paid</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Balance
                    </th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map((bill, index) => {
                    const balanceDue = toNumber(bill.balance_due);

                    return (
                      <tr
                        key={bill.id}
                        className="bg-white transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 align-middle text-slate-500">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-950">
                              {bill.invoice_number || `BILL-${bill.id}`}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              Bill ID: {bill.id}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2 text-slate-800">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                              <Users size={15} />
                            </div>
                            <span className="max-w-[180px] truncate font-semibold">
                              {bill.customer_name || "Walk-in customer"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />
                            {formatDate(bill.sale_date)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right align-middle font-semibold text-slate-950">
                          {formatCurrency(bill.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-right align-middle font-semibold text-slate-700">
                          {formatCurrency(bill.paid_amount)}
                        </td>
                        <td className="px-5 py-4 text-right align-middle">
                          <span
                            className={`font-bold ${balanceDue > 0 ? "text-rose-600" : "text-emerald-600"}`}
                          >
                            {formatCurrency(balanceDue)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <StatusBadge status={bill.payment_status} />
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewBill(bill.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#ffcf83] hover:bg-[#ffcf83]/20 hover:text-slate-950"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdateBill(bill.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#ffcf83] hover:bg-[#ffcf83]/20 hover:text-slate-950"
                              title="Update Bill"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              disabled={deleteLoading === bill.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                              title="Delete Bill"
                            >
                              {deleteLoading === bill.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-rose-600" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffcf83] bg-[#ffcf83]/30 text-slate-950">
                <ReceiptText size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-950">
                {bills.length ? "No matching bills found" : "No bills found"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {bills.length
                  ? "Try another customer name, invoice number, date, or amount."
                  : "There are no bills to display at the moment."}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
