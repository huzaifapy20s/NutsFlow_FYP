import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchItems } from "../../features/items/itemsSlice";
import { formatCurrency } from "../../utils/formatters";
import { ArrowLeft, Download, Edit, Trash2 } from "lucide-react";

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

  const handleUpdateBill = () => {
    navigate(`/bills/${billId}/edit`);
  };

  const handleDeleteBill = async () => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/sales/${billId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('dfms_auth') || '{}')?.accessToken || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete bill');
      }

      dispatch(fetchItems());
      navigate('/bills');
    } catch (error) {
      console.error("Failed to delete bill:", error);
      alert("Failed to delete bill");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePrintBill = () => {
    window.print();
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/bills')}
            className="flex items-center text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Bills
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bill Details</h1>
            <p className="text-slate-600">Invoice: {bill.invoice_number}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintBill}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          >
            <Download size={16} className="mr-2" />
            Print
          </button>
          <button
            onClick={handleUpdateBill}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Edit size={16} className="mr-2" />
            Update
          </button>
          <button
            onClick={handleDeleteBill}
            disabled={deleteLoading}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleteLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Trash2 size={16} className="mr-2" />
            )}
            Delete
          </button>
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
              <span className="text-slate-500">Payment Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                bill.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : bill.payment_status === 'partial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {bill.payment_status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(bill.paid_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance Due:</span>
              <span className={`font-medium ${Number(bill.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(bill.balance_due)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Items</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bill.sale_items && bill.sale_items.length > 0 ? (
                bill.sale_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-slate-500">
                    No items found for this bill
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}