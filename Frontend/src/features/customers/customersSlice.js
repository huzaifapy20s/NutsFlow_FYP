import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialDraft = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
  opening_balance: "0.00",
};

export const fetchCustomers = createAsyncThunk("customers/fetchCustomers", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/customers");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch customers.");
  }
});

export const createCustomer = createAsyncThunk("customers/createCustomer", async (_, { getState, rejectWithValue }) => {
  try {
    const payload = getState().customers.draft;
    await axiosClient.post("/api/customers", payload);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to create customer.");
  }
});

export const updateCustomer = createAsyncThunk("customers/updateCustomer", async (_, { getState, rejectWithValue }) => {
  try {
    const { editingId, draft } = getState().customers;
    await axiosClient.put(`/api/customers/${editingId}`, draft);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to update customer.");
  }
});

export const deleteCustomer = createAsyncThunk("customers/deleteCustomer", async (customerId, { rejectWithValue }) => {
  try {
    await axiosClient.delete(`/api/customers/${customerId}`);
    return customerId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to delete customer.");
  }
});

export const restoreCustomer = createAsyncThunk("customers/restoreCustomer", async (customerId, { rejectWithValue }) => {
  try {
    await axiosClient.put(`/api/customers/${customerId}`, { is_active: true });
    return customerId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to restore customer.");
  }
});

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    list: [],
    loading: false,
    submitting: false,
    error: null,
    editingId: null,
    draft: initialDraft,
  },
  reducers: {
    setCustomerDraftField: (state, action) => {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    editCustomer: (state, action) => {
      const customer = action.payload;
      state.editingId = customer.id;
      state.draft = {
        full_name: customer.full_name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        opening_balance: customer.opening_balance,
      };
    },
    resetCustomerDraft: (state) => {
      state.editingId = null;
      state.draft = initialDraft;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(createCustomer.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateCustomer.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state) => {
        state.submitting = false;
        state.editingId = null;
        state.draft = initialDraft;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deleteCustomer.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.submitting = false;
        state.list = state.list.filter((customer) => customer.id !== action.payload);
        if (state.editingId === action.payload) {
          state.editingId = null;
          state.draft = initialDraft;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(restoreCustomer.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(restoreCustomer.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(restoreCustomer.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { setCustomerDraftField, editCustomer, resetCustomerDraft } = customersSlice.actions;
export default customersSlice.reducer;