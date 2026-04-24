import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "../routes/ProtectedRoute";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ItemPage from "../pages/items/ItemPage";
import CustomerPage from "../pages/customers/CustomerPage";
import SupplierPage from "../pages/suppliers/SupplierPage";
import PurchasePage from "../pages/purchases/PurchasePage";
import PosPage from "../pages/sales/PosPage";
import ExpensePage from "../pages/expenses/ExpensePage";
import AccountsPage from "../pages/accounts/AccountsPage";
import GeneralLedgerPage from "../pages/accounts/GeneralLedgerPage";
import ProfitLossPage from "../pages/reports/ProfitLossPage";
import SalesReportPage from "../pages/reports/SalesReportPage";
import StockReportPage from "../pages/reports/StockReportPage";
import BestSellingPage from "../pages/reports/BestSellingPage";
import IncomeStatementPage from "../pages/reports/IncomeStatementPage";
import BillDetailsPage from "../pages/bills/BillDetailsPage";
import BillDetailView from "../pages/bills/BillDetailView";
import BillEditPage from "../pages/bills/BillEditPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "items", element: <ItemPage /> },
      { path: "customers", element: <CustomerPage /> },
      { path: "suppliers", element: <SupplierPage /> },
      { path: "purchases", element: <PurchasePage /> },
      { path: "sales/pos", element: <PosPage /> },
      { path: "expenses", element: <ExpensePage /> },
      { path: "accounts", element: <AccountsPage /> },
      { path: "accounts/general-ledger/:accountId", element: <GeneralLedgerPage /> },
      { path: "reports/profit-loss", element: <ProfitLossPage /> },
      { path: "reports/sales", element: <SalesReportPage /> },
      { path: "reports/stock", element: <StockReportPage /> },
      { path: "reports/best-selling", element: <BestSellingPage /> },
      { path: "reports/income-statement", element: <IncomeStatementPage /> },
      { path: "bills", element: <BillDetailsPage /> },
      { path: "bills/:billId", element: <BillDetailView /> },
      { path: "bills/:billId/edit", element: <BillEditPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);