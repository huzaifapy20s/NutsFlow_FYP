import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

export const fetchChartOfAccounts = createAsyncThunk("accounts/fetchChartOfAccounts", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/accounts/chart-of-accounts");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch chart of accounts.");
  }
});

export const fetchFinancialAccounts = createAsyncThunk("accounts/fetchFinancialAccounts", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/accounts/financial-accounts");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch financial accounts.");
  }
});

export const fetchCustomerAccounts = createAsyncThunk("accounts/fetchCustomerAccounts", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/customers");
    return response.data.data.map((customer) => ({
      id: customer.id,
      account_name: customer.full_name,
      account_type: "asset",
      current_balance: customer.opening_balance,
      is_active: customer.is_active,
      entity_type: "customer",
    }));
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch customer accounts.");
  }
});

export const fetchSupplierAccounts = createAsyncThunk("accounts/fetchSupplierAccounts", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/suppliers");
    return response.data.data.map((supplier) => ({
      id: supplier.id,
      account_name: supplier.supplier_name,
      account_type: "liability",
      current_balance: supplier.opening_balance,
      is_active: supplier.is_active,
      entity_type: "supplier",
    }));
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch supplier accounts.");
  }
});

// General ledger for Chart of Accounts
export const fetchGeneralLedger = createAsyncThunk("accounts/fetchGeneralLedger", async (accountId, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get(`/api/accounts/general-ledger/${accountId}`);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch general ledger.");
  }
});

// Dedicated ledger for a specific Customer
export const fetchCustomerLedger = createAsyncThunk("accounts/fetchCustomerLedger", async (customerId, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get(`/api/accounts/customer-ledger/${customerId}`);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch customer ledger.");
  }
});

// Dedicated ledger for a specific Supplier
export const fetchSupplierLedger = createAsyncThunk("accounts/fetchSupplierLedger", async (supplierId, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get(`/api/accounts/supplier-ledger/${supplierId}`);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch supplier ledger.");
  }
});

const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    chartAccounts: [],
    financialAccounts: [],
    customerAccounts: [],
    supplierAccounts: [],
    generalLedger: null,
    ledgerLoading: false,
    ledgerError: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearGeneralLedger: (state) => {
      state.generalLedger = null;
      state.ledgerError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChartOfAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChartOfAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.chartAccounts = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchChartOfAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.chartAccounts = [];
      })
      .addCase(fetchFinancialAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinancialAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.financialAccounts = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchFinancialAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.financialAccounts = [];
      })
      .addCase(fetchCustomerAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.customerAccounts = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchCustomerAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.customerAccounts = [];
      })
      .addCase(fetchSupplierAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.supplierAccounts = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSupplierAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.supplierAccounts = [];
      })
      // Chart of Account general ledger
      .addCase(fetchGeneralLedger.pending, (state) => {
        state.ledgerLoading = true;
        state.ledgerError = null;
        state.generalLedger = null;
      })
      .addCase(fetchGeneralLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.generalLedger = action.payload;
      })
      .addCase(fetchGeneralLedger.rejected, (state, action) => {
        state.ledgerLoading = false;
        state.ledgerError = action.payload;
      })
      // Customer ledger
      .addCase(fetchCustomerLedger.pending, (state) => {
        state.ledgerLoading = true;
        state.ledgerError = null;
        state.generalLedger = null;
      })
      .addCase(fetchCustomerLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.generalLedger = action.payload;
      })
      .addCase(fetchCustomerLedger.rejected, (state, action) => {
        state.ledgerLoading = false;
        state.ledgerError = action.payload;
      })
      // Supplier ledger
      .addCase(fetchSupplierLedger.pending, (state) => {
        state.ledgerLoading = true;
        state.ledgerError = null;
        state.generalLedger = null;
      })
      .addCase(fetchSupplierLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.generalLedger = action.payload;
      })
      .addCase(fetchSupplierLedger.rejected, (state, action) => {
        state.ledgerLoading = false;
        state.ledgerError = action.payload;
      });
  },
});

export const { clearGeneralLedger } = accountsSlice.actions;
export default accountsSlice.reducer;