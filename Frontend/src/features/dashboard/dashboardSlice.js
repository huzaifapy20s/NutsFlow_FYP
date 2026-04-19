import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

export const fetchDashboardSummary = createAsyncThunk("dashboard/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/dashboard/summary");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch dashboard summary.");
  }
});

export const fetchLowStockItems = createAsyncThunk("dashboard/fetchLowStock", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/dashboard/low-stock");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch low stock items.");
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    summary: null,
    lowStockItems: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLowStockItems.fulfilled, (state, action) => {
        state.lowStockItems = action.payload;
      });
  },
});

export default dashboardSlice.reducer;