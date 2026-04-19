import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import dashboardReducer from "../features/dashboard/dashboardSlice";
import itemsReducer from "../features/items/itemsSlice";
import customersReducer from "../features/customers/customersSlice";
import suppliersReducer from "../features/suppliers/suppliersSlice";
import accountsReducer from "../features/accounts/accountsSlice";
import purchasesReducer from "../features/purchases/purchasesSlice";
import posReducer from "../features/pos/posSlice";
import expensesReducer from "../features/expenses/expensesSlice";
import reportsReducer from "../features/reports/reportsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    items: itemsReducer,
    customers: customersReducer,
    suppliers: suppliersReducer,
    accounts: accountsReducer,
    purchases: purchasesReducer,
    pos: posReducer,
    expenses: expensesReducer,
    reports: reportsReducer,
  },
});