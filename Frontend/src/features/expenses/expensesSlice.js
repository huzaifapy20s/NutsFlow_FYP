import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialDraft = {
  expense_date: new Date().toISOString().slice(0, 10),
  expense_category_account_id: "",
  paid_from_account_id: "",
  amount: "0.00",
  description: "",
  reference_number: "",
};

export const fetchExpenses = createAsyncThunk("expenses/fetchExpenses", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/expenses");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch expenses.");
  }
});

export const createExpense = createAsyncThunk("expenses/createExpense", async (_, { getState, rejectWithValue }) => {
  try {
    const payload = getState().expenses.draft;
    const response = await axiosClient.post("/api/expenses", payload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to create expense.");
  }
});

const expensesSlice = createSlice({
  name: "expenses",
  initialState: {
    list: [],
    draft: initialDraft,
    loading: false,
    submitting: false,
    error: null,
  },
  reducers: {
    setExpenseField: (state, action) => {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    resetExpenseDraft: (state) => {
      state.draft = initialDraft;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(createExpense.pending, (state) => {
        state.submitting = true;
      })
      .addCase(createExpense.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { setExpenseField, resetExpenseDraft } = expensesSlice.actions;
export default expensesSlice.reducer;