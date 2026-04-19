import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/formatters";
import { ArrowLeft, Save, X } from "lucide-react";

export default function BillEditPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    discount_amount: 0,
    tax_amount: 0,
    paid_amount: 0,
    payment_method: "cash",
  });

  const fetchBillDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/sales/${billId}`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('dfms_auth') || '{}')?.accessToken || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bill details');
      }

      const data = await response.json();
      setBill(data.data);
      setFormData({
        discount_amount: data.data.discount_amount || 0,
        tax_amount: data.data.tax_amount || 0,
        paid_amount: data.data.paid_amount || 0,
        payment_method: data.data.payment_method || "cash",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBillDetails();
  }, [fetchBillDetails]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/sales/${billId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('dfms_auth') || '{}')?.accessToken || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update bill');
      }

      navigate(`/bills/${billId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="ml-3 text-slate-600">Loading bill details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900">Bill not found</h3>
          <p className="text-slate-500">The requested bill could not be found.</p>
        </div>
      </div>
    );
  }

  const subtotal = Number(bill.subtotal) || 0;
  const discount = Number(formData.discount_amount) || 0;
  const tax = Number(formData.tax_amount) || 0;
  const total = subtotal - discount + tax;
  const paidAmount = Number(formData.paid_amount) || 0;
  const balanceDue = total - paidAmount;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/bills/${billId}`)}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Bill
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Bill</h1>
            <p className="text-slate-600">Invoice: {bill.invoice_number}</p>
          </div>
        </div>
      </div>

      {/* Bill Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Bill Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Number:</span>
              <span className="font-medium">{bill.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium">{new Date(bill.sale_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium">{bill.customer?.full_name || "Walk-in Customer"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">New Total:</span>
              <span className="font-medium text-blue-600">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3">
              <span className="text-slate-500 font-medium">New Balance Due:</span>
              <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Bill Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Discount Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">PKR</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount_amount}
                onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
                className="pl-12 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tax Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">PKR</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.tax_amount}
                onChange={(e) => handleInputChange('tax_amount', parseFloat(e.target.value) || 0)}
                className="pl-12 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paid Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">PKR</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.paid_amount}
                onChange={(e) => handleInputChange('paid_amount', parseFloat(e.target.value) || 0)}
                className="pl-12 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Items Table (Read-only) */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Items (Read-only)</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bill.sale_items && bill.sale_items.length > 0 ? (
                  bill.sale_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-slate-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-center text-slate-500">No items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(`/bills/${billId}`)}
            className="flex items-center px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
          >
            <X size={16} className="mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
