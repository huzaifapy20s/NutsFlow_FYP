import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

export const fetchProfitLoss = createAsyncThunk("reports/fetchProfitLoss", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/reports/profit-loss");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch profit/loss.");
  }
});

export const fetchSalesReport = createAsyncThunk("reports/fetchSalesReport", async (_, { getState, rejectWithValue }) => {
  try {
    const period = getState().reports.salesPeriod;
    const response = await axiosClient.get(`/api/reports/sales?period=${period}`);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch sales report.");
  }
});

export const fetchStockReport = createAsyncThunk("reports/fetchStockReport", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/reports/stock");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch stock report.");
  }
});

export const fetchRecentBills = createAsyncThunk("reports/fetchRecentBills", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/sales");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch recent bills.");
  }
});

const reportsSlice = createSlice({
  name: "reports",
  initialState: {
    profitLoss: null,
    salesReport: [],
    stockReport: [],
    recentBills: [],
    salesPeriod: "daily",
    loading: false,
    error: null,
  },
  reducers: {
    setSalesPeriod: (state, action) => {
      state.salesPeriod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfitLoss.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfitLoss.fulfilled, (state, action) => {
        state.loading = false;
        state.profitLoss = action.payload;
      })
      .addCase(fetchSalesReport.fulfilled, (state, action) => {
        state.salesReport = action.payload;
      })
      .addCase(fetchStockReport.fulfilled, (state, action) => {
        state.stockReport = action.payload;
      })
      .addCase(fetchRecentBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentBills.fulfilled, (state, action) => {
        state.loading = false;
        state.recentBills = action.payload;
      })
      .addCase(fetchRecentBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProfitLoss.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSalesPeriod } = reportsSlice.actions;
export default reportsSlice.reducer;