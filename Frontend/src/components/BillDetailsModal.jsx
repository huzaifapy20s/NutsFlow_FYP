import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchRecentBills } from "../features/reports/reportsSlice";
import { formatCurrency } from "../utils/formatters";

export default function BillDetailsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { recentBills, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchRecentBills());
    }
  }, [dispatch, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Bill Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              <span className="ml-3 text-slate-600">Loading bills...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(recentBills) && recentBills.length > 0 ? (
                recentBills.map((bill) => (
                  <div key={bill.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{bill.invoice_number}</h3>
                        <p className="text-sm text-slate-600">{bill.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bill.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : bill.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bill.payment_status}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Date:</span>
                        <span className="ml-2 text-slate-900">
                          {new Date(bill.sale_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Total:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {formatCurrency(bill.total_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Paid:</span>
                        <span className="ml-2 text-slate-900">
                          {formatCurrency(bill.paid_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Balance:</span>
                        <span className={`ml-2 font-medium ${
                          Number(bill.balance_due) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(bill.balance_due)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-slate-900">No bills found</h3>
                  <p className="mt-1 text-sm text-slate-500">There are no bills to display at the moment.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
