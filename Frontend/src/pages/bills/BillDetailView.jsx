import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchItems } from "../../features/items/itemsSlice";
import { ArrowLeft, Edit, Printer, Trash2 } from "lucide-react";

const BUSINESS = {
  name: "NUTS FLOW",
  subtitle: "Dry Fruits ERP & POS",
  address: "M.Zahid Trader Raja Bazar Rawalpindi, Pakistan",
  phone1: "03293366565",
  thankYou: "Thank you for shopping!",
  footer: "Powered by NutsFlow",
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function toNumber(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(value) {
  const num = toNumber(value);
  return num.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatReceiptDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthToken() {
  try {
    return JSON.parse(localStorage.getItem("dfms_auth") || "{}")?.accessToken || "";
  } catch {
    return "";
  }
}

function BarcodeBlock() {
  const bars = [
    2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 2, 3, 1, 4,
    2, 1, 3, 1, 2, 4, 1, 3, 2, 1,
  ];

  return (
    <div className="nf-barcode" aria-hidden="true">
      {bars.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className="nf-bar"
          style={{ width: `${width}px` }}
        />
      ))}
    </div>
  );
}

function ReceiptRow({ label, value, strong = false }) {
  return (
    <div className={`nf-summary-row ${strong ? "nf-summary-row-strong" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function BillDetailView() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBillDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/sales/${billId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bill details");
      }

      const data = await response.json();
      setBill(data.data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    fetchBillDetails();
  }, [fetchBillDetails]);

  const subtotal = useMemo(() => toNumber(bill?.subtotal), [bill]);
  const discount = useMemo(() => toNumber(bill?.discount_amount), [bill]);
  const tax = useMemo(() => toNumber(bill?.tax_amount), [bill]);
  const total = useMemo(() => toNumber(bill?.total_amount), [bill]);
  const paid = useMemo(() => toNumber(bill?.paid_amount), [bill]);
  const balance = useMemo(() => toNumber(bill?.balance_due), [bill]);
  const totalQty = useMemo(
    () => (bill?.sale_items || []).reduce((sum, item) => sum + toNumber(item.quantity), 0),
    [bill]
  );

  const customerName = bill?.customer?.full_name || "Walk-in Customer";

  const handleUpdateBill = () => {
    navigate(`/bills/${billId}/edit`);
  };

  const handleDeleteBill = async () => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/sales/${billId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete bill");
      }

      dispatch(fetchItems());
      navigate("/bills");
    } catch (err) {
      console.error("Failed to delete bill:", err);
      alert("Failed to delete bill");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
          <span className="ml-3 text-slate-600">Loading bill details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <div className="py-16 text-center">
          <h3 className="text-lg font-semibold text-slate-900">Bill not found</h3>
          <p className="text-slate-500">The requested bill could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .nf-bill-page {
          min-height: 100%;
          background: #f8fafc;
          padding: 24px;
        }

        .nf-screen-toolbar {
          max-width: 1160px;
          margin: 0 auto 20px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .nf-screen-toolbar::before {
          content: "";
          display: block;
          height: 6px;
          width: 100%;
          background: #ffcf83;
        }

        .nf-screen-toolbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 22px 24px;
        }

        .nf-toolbar-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        .nf-toolbar-copy {
          min-width: 240px;
        }

        .nf-toolbar-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #64748b;
          text-transform: uppercase;
        }

        .nf-toolbar-kicker::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #ffcf83;
        }

        .nf-back-btn,
        .nf-action-btn {
          border: 1px solid #dbe4ee;
          background: #ffffff;
          color: #0f172a;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .nf-back-btn:hover,
        .nf-action-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .nf-action-btn-primary {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }

        .nf-action-btn-primary:hover {
          background: #1e293b;
        }

        .nf-action-btn-danger {
          background: #ffffff;
          color: #dc2626;
          border-color: #fecaca;
        }

        .nf-action-btn-danger:hover {
          background: #fff1f2;
          border-color: #fca5a5;
        }

        .nf-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          background: #f8fafc;
          padding: 6px 10px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .nf-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #ffcf83;
        }

        .nf-preview-shell {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(300px, 420px) minmax(280px, 1fr);
          gap: 24px;
          align-items: start;
        }

        .nf-receipt-stage {
          background: linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          justify-content: center;
          min-height: 820px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .nf-side-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .nf-side-card-accent {
          height: 4px;
          width: 100%;
          background: #ffcf83;
        }

        .nf-side-card-body {
          padding: 20px;
        }

        .nf-side-grid {
          display: grid;
          gap: 16px;
        }

        .nf-side-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .nf-side-muted {
          font-size: 12px;
          color: #64748b;
          margin-top: -6px;
          margin-bottom: 12px;
        }

        .nf-side-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        .nf-side-row:last-child {
          border-bottom: none;
        }

        .nf-side-label {
          color: #64748b;
          font-weight: 600;
        }

        .nf-side-value {
          color: #0f172a;
          font-weight: 700;
          text-align: right;
        }

        .nf-side-total {
          margin-top: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #f8fafc;
          padding: 12px 14px;
        }

        .nf-side-total .nf-side-row {
          padding: 4px 0;
          border-bottom: none;
        }

        .nf-side-total .nf-side-value {
          font-size: 18px;
        }

        .nf-receipt {
          width: 80mm;
          min-height: auto;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
          padding: 10px 8px 14px;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.25;
        }

        .nf-center {
          text-align: center;
        }

        .nf-brand-mark {
          width: 44px;
          height: 44px;
          margin: 0 auto 6px;
          border: 1.6px solid #111827;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.08em;
        }

        .nf-store-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.06em;
          margin: 2px 0;
          text-transform: uppercase;
        }

        .nf-store-subtitle,
        .nf-store-meta {
          font-size: 11px;
          margin-top: 2px;
        }

        .nf-receipt-title {
          margin: 10px 0 8px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .nf-section {
          border-top: 1px dashed #111827;
          padding-top: 8px;
          margin-top: 8px;
        }

        .nf-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .nf-meta-label {
          color: #374151;
          min-width: 74px;
        }

        .nf-meta-value {
          color: #111827;
          text-align: right;
          flex: 1;
          word-break: break-word;
          font-weight: 600;
        }

        .nf-items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-top: 8px;
          font-size: 10.5px;
        }

        .nf-items-table th,
        .nf-items-table td {
          border: 1px solid #111827;
          padding: 4px 3px;
          vertical-align: top;
        }

        .nf-items-table th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: #f8fafc;
          text-align: center;
        }

        .nf-col-item {
          width: 38%;
          text-align: left;
          word-break: break-word;
        }

        .nf-col-qty {
          width: 15%;
          text-align: center;
        }

        .nf-col-rate {
          width: 22%;
          text-align: right;
        }

        .nf-col-total {
          width: 25%;
          text-align: right;
        }

        .nf-item-name {
          font-weight: 600;
        }

        .nf-item-sub {
          display: block;
          color: #475569;
          font-size: 9px;
          margin-top: 2px;
        }

        .nf-summary-box {
          width: 64%;
          margin-left: auto;
          margin-top: 10px;
          border: 1px solid #111827;
          padding: 6px 7px;
        }

        .nf-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          padding: 2px 0;
        }

        .nf-summary-row-strong {
          font-weight: 800;
        }

        .nf-totals-strip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          margin-top: 8px;
          font-size: 10px;
        }

        .nf-chip {
          border: 1px dashed #111827;
          padding: 4px 6px;
          text-align: center;
        }

        .nf-barcode {
          height: 52px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 1px;
          margin: 10px 0 6px;
        }

        .nf-bar {
          display: inline-block;
          background: #111827;
          height: 100%;
        }

        .nf-footer-note {
          margin-top: 6px;
          font-size: 11px;
          text-align: center;
        }

        .nf-mini-logo {
          margin-top: 8px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .nf-software-line {
          margin-top: 6px;
          font-size: 9px;
          text-align: center;
          color: #334155;
        }

        .nf-notes {
          margin-top: 8px;
          border-top: 1px dashed #111827;
          padding-top: 6px;
          font-size: 10px;
        }

        @media (max-width: 1024px) {
          .nf-preview-shell {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 80mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          .nf-print-area,
          .nf-print-area * {
            visibility: visible;
          }

          .nf-bill-page {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .nf-screen-toolbar,
          .nf-side-panel {
            display: none !important;
          }

          .nf-preview-shell,
          .nf-receipt-stage {
            display: block !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            border: none !important;
            min-height: auto !important;
            box-shadow: none !important;
          }

          .nf-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }

          .nf-receipt {
            width: 80mm;
            border-radius: 0;
            box-shadow: none;
            padding: 6mm 4mm 7mm;
            margin: 0;
          }
        }
      `}</style>

      <div className="nf-bill-page">
        <div className="nf-screen-toolbar">
          <div className="nf-screen-toolbar-inner">
            <div className="nf-toolbar-left">
              <button className="nf-back-btn" onClick={() => navigate("/bills")}>
                <ArrowLeft size={17} />
                Back to Bills
              </button>
              <div className="nf-toolbar-copy">
                <div className="nf-toolbar-kicker">Bill Preview</div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">Bill Details</h1>
                <p className="mt-1 text-sm text-slate-500">Review bill information and print the saved receipt.</p>
                <div className="nf-status-pill mt-3">
                  <span className="nf-status-dot" />
                  {bill.payment_status || "unpaid"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <button className="nf-action-btn nf-action-btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              Print Receipt
            </button>
            <button className="nf-action-btn" onClick={handleUpdateBill}>
              <Edit size={16} />
              Update
            </button>
            <button
              className="nf-action-btn nf-action-btn-danger"
              onClick={handleDeleteBill}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
            </div>
          </div>
        </div>

        <div className="nf-preview-shell">
          <div className="nf-receipt-stage nf-print-area">
            <div className="nf-receipt">
              <div className="nf-center">
                <div className="nf-brand-mark">NF</div>
                <div className="nf-store-name">{BUSINESS.name}</div>
                <div className="nf-store-subtitle">{BUSINESS.subtitle}</div>
                <div className="nf-store-meta">{BUSINESS.address}</div>
                <div className="nf-store-meta">{BUSINESS.phone1} &nbsp; | &nbsp; {BUSINESS.phone2}</div>
                <div className="nf-receipt-title">Sale Receipt</div>
              </div>

              <div className="nf-section">
                <div className="nf-meta-row">
                  <span className="nf-meta-label">Receipt No:</span>
                  <span className="nf-meta-value">{bill.invoice_number || `BILL-${bill.id}`}</span>
                </div>
                <div className="nf-meta-row">
                  <span className="nf-meta-label">Date:</span>
                  <span className="nf-meta-value">{formatReceiptDate(bill.sale_date)}</span>
                </div>
                <div className="nf-meta-row">
                  <span className="nf-meta-label">Customer:</span>
                  <span className="nf-meta-value">{customerName}</span>
                </div>
                <div className="nf-meta-row">
                  <span className="nf-meta-label">Status:</span>
                  <span className="nf-meta-value" style={{ textTransform: "capitalize" }}>
                    {bill.payment_status || "unpaid"}
                  </span>
                </div>
                {bill.payment_method ? (
                  <div className="nf-meta-row">
                    <span className="nf-meta-label">Method:</span>
                    <span className="nf-meta-value" style={{ textTransform: "capitalize" }}>
                      {String(bill.payment_method).replace(/_/g, " ")}
                    </span>
                  </div>
                ) : null}
              </div>

              <table className="nf-items-table">
                <thead>
                  <tr>
                    <th className="nf-col-item">Item</th>
                    <th className="nf-col-qty">Qty</th>
                    <th className="nf-col-rate">Price</th>
                    <th className="nf-col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.sale_items?.length ? (
                    bill.sale_items.map((item) => (
                      <tr key={item.id}>
                        <td className="nf-col-item">
                          <span className="nf-item-name">{item.item_name}</span>
                        </td>
                        <td className="nf-col-qty">{toNumber(item.quantity).toFixed(2)}</td>
                        <td className="nf-col-rate">{formatAmount(item.unit_price)}</td>
                        <td className="nf-col-total">{formatAmount(item.line_total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-3 text-center">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="nf-summary-box">
                <ReceiptRow label="Subtotal:" value={formatAmount(subtotal)} />
                {discount > 0 ? <ReceiptRow label="Discount:" value={formatAmount(discount)} /> : null}
                {tax > 0 ? <ReceiptRow label="Tax:" value={formatAmount(tax)} /> : null}
                <ReceiptRow label="Paid:" value={formatAmount(paid)} />
                <ReceiptRow label="Balance:" value={formatAmount(balance)} strong />
                <ReceiptRow label="Total:" value={formatAmount(total)} strong />
              </div>

              <div className="nf-totals-strip">
                <div className="nf-chip">Items: {bill.sale_items?.length || 0}</div>
                <div className="nf-chip">Qty: {formatAmount(totalQty)}</div>
              </div>

              <BarcodeBlock />

              <div className="nf-footer-note">{BUSINESS.thankYou}</div>
              <div className="nf-mini-logo">{BUSINESS.name}</div>
              <div className="nf-software-line">{BUSINESS.footer}</div>

              {bill.notes ? <div className="nf-notes">Note: {bill.notes}</div> : null}
            </div>
          </div>

          <div className="nf-side-panel nf-side-grid">
            <div className="nf-side-card">
              <div className="nf-side-card-accent" />
              <div className="nf-side-card-body">
                <div className="nf-side-title">Bill Information</div>
                <p className="nf-side-muted">Saved sale and customer information.</p>
                <div className="nf-side-row">
                  <span className="nf-side-label">Invoice Number</span>
                  <span className="nf-side-value">{bill.invoice_number || `BILL-${bill.id}`}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Customer</span>
                  <span className="nf-side-value">{customerName}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Date & Time</span>
                  <span className="nf-side-value">{formatReceiptDate(bill.sale_date)}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Payment Status</span>
                  <span className="nf-side-value" style={{ textTransform: "capitalize" }}>
                    {bill.payment_status || "unpaid"}
                  </span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Payment Method</span>
                  <span className="nf-side-value" style={{ textTransform: "capitalize" }}>
                    {bill.payment_method ? String(bill.payment_method).replace(/_/g, " ") : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="nf-side-card">
              <div className="nf-side-card-accent" />
              <div className="nf-side-card-body">
                <div className="nf-side-title">Payment Summary</div>
                <p className="nf-side-muted">Totals are unchanged from the saved bill.</p>
                <div className="nf-side-row">
                  <span className="nf-side-label">Subtotal</span>
                  <span className="nf-side-value">Rs {formatAmount(subtotal)}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Discount</span>
                  <span className="nf-side-value">Rs {formatAmount(discount)}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Tax</span>
                  <span className="nf-side-value">Rs {formatAmount(tax)}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Paid</span>
                  <span className="nf-side-value">Rs {formatAmount(paid)}</span>
                </div>
                <div className="nf-side-row">
                  <span className="nf-side-label">Balance</span>
                  <span className="nf-side-value">Rs {formatAmount(balance)}</span>
                </div>
                <div className="nf-side-total">
                  <div className="nf-side-row">
                    <span className="nf-side-label">Grand Total</span>
                    <span className="nf-side-value">Rs {formatAmount(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
